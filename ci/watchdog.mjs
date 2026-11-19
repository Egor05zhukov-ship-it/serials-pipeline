// Runs on the publish machine after every sync. Since 19.11.2026 an episode is written after the viewers have voted
// under the previous one, so there is no stock for tomorrow: the question is whether every account has an episode
// TODAY (Moscow time). If one has not by the evening check, a GitHub issue is opened and the run fails on purpose:
// GitHub mails the repository owner, so a stalled writer is not silent for days again (17-18.11.2026 the writer
// routines vanished with a change of the Claude account and nobody knew).
// When things are back, the issue is closed with a comment. Needs GH_TOKEN with issues: write; without it, only prints.
import fs from 'node:fs';

const q = JSON.parse(fs.readFileSync('state/queue.json', 'utf8'));
const msk = new Date(Date.now() + 3 * 3600e3), today = msk.toISOString().slice(0, 10);
const tomorrow = today; // the texts below speak about the day that is checked
const short = (d) => d.slice(8, 10) + '.' + d.slice(5, 7);
const TITLE = 'Нет серии на сегодня';
const empty = [], hold = new Set(q.hold || []);
for (const [nick, a] of Object.entries(q.accounts)) {
  if (a.paused) continue;
  const eps = q.episodes.filter((e) => e.account === nick && !e.remake && !hold.has(e.series));
  const on = (e) => (e.status === 'scheduled' && (e.scheduledFor || '').slice(0, 10) >= today) || (e.status === 'published' && (e.publishedAt || e.scheduledFor || '').slice(0, 10) === today);
  if (!eps.some((e) => on(e) || ['ready', 'written'].includes(e.status))) empty.push(nick);
}
const failed = q.episodes.filter((e) => e.status === 'failed').map((e) => `${e.id}: ${String(e.failNote || '').slice(0, 200)}`);
// accounts Instagram has locked (publish/health.mjs): reels cannot go out until the owner clears the check himself
let health = {};
try { health = JSON.parse(fs.readFileSync('state/health.json', 'utf8')).accounts || {}; } catch { /* no check yet */ }
const WHY = {
  check: 'Instagram просит войти в аккаунт и пройти проверку («подтвердите, что вы человек»), затем переподключить его к сервису публикации',
  reconnect: 'Instagram сбросил вход (смена пароля или проверка безопасности): войти в аккаунт и переподключить его к сервису публикации',
  error: 'сервис публикации не может работать с аккаунтом: открыть сессию Claude на Маке и написать «проверь аккаунты»',
};
const blocked = Object.entries(health).filter(([n, v]) => v && v.ok === false && q.accounts[n] && !q.accounts[n].paused).map(([n, v]) => `@${n}: ${WHY[v.code] || WHY.error} (с ${v.since})`);
console.log(JSON.stringify({ today, tomorrow, empty, failed, blocked }));

// exit code 3 = «nothing today» at the evening check, or a locked account at any check: ci/run.sh then fails the
// scheduled run and GitHub mails the owner
const code = (empty.length && new Date().getUTCHours() >= 14) || blocked.length ? 3 : 0;
const token = process.env.GH_TOKEN, repo = process.env.GITHUB_REPOSITORY;
if (!token || !repo) process.exit(code);
const gh = async (method, path, body) => {
  const r = await fetch(`https://api.github.com/repos/${repo}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? {} : r.json();
};
try {
const open = (await gh('GET', '/issues?state=open&per_page=50')).filter((i) => i.title.startsWith(TITLE));
if (empty.length) {
  if (!open.length) {
    const body = [
      `Сегодня, ${short(today)}, нет серии: ${empty.map((n) => '@' + n).join(', ')}.`,
      '',
      'Автор серий не прислал серию после вчерашнего голосования. Чаще всего причина в том, что облачные задачи Claude (serials-writer, serials-replier) остались на другом аккаунте Claude или кончился лимит.',
      'Что сделать: открыть сессию Claude на Маке и написать «проверь автономность» — задачи пересоздаются, автор запускается вручную.',
      failed.length ? `\nСерии, которые не собрались:\n- ${failed.join('\n- ')}` : '',
      blocked.length ? `\nInstagram закрыл доступ, пока владелец не пройдёт проверку сам:\n- ${blocked.join('\n- ')}` : '',
    ].join('\n');
    const i = await gh('POST', '/issues', { title: `${TITLE} (${short(tomorrow)})`, body });
    console.log(`issue opened: ${i.html_url}`);
  } else console.log(`issue already open: ${open[0].html_url}`);
} else {
  for (const i of open) {
    await gh('POST', `/issues/${i.number}/comments`, { body: `Серии на ${short(today)} есть у всех аккаунтов, закрываю.` });
    await gh('PATCH', `/issues/${i.number}`, { state: 'closed' });
    console.log(`issue closed: ${i.html_url}`);
  }
}
} catch (err) { console.log(`issues: ${err.message}`); }
process.exit(code);
