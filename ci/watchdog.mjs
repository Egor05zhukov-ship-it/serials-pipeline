// Runs on the publish machine after every sync. If an account has nothing on the air plan for tomorrow (Moscow time),
// it opens a GitHub issue: GitHub mails the repository owner, so a stalled writer is not silent for days again
// (17-18.11.2026 the writer routines vanished with a change of the Claude account and nobody knew).
// When the stock is back, the issue is closed with a comment. Needs GH_TOKEN with issues: write; without it, only prints.
import fs from 'node:fs';

const q = JSON.parse(fs.readFileSync('state/queue.json', 'utf8'));
const msk = new Date(Date.now() + 3 * 3600e3), today = msk.toISOString().slice(0, 10);
const tomorrow = new Date(Date.parse(today + 'T00:00:00Z') + 864e5).toISOString().slice(0, 10);
const short = (d) => d.slice(8, 10) + '.' + d.slice(5, 7);
const TITLE = 'Нет серии на завтра';
const empty = [];
for (const [nick, a] of Object.entries(q.accounts)) {
  if (a.paused) continue;
  const eps = q.episodes.filter((e) => e.account === nick);
  const ok = eps.some((e) => ['ready', 'written'].includes(e.status) || (e.status === 'scheduled' && (e.scheduledFor || '').slice(0, 10) >= tomorrow));
  if (!ok) empty.push(nick);
}
const failed = q.episodes.filter((e) => e.status === 'failed').map((e) => `${e.id}: ${String(e.failNote || '').slice(0, 200)}`);
console.log(JSON.stringify({ today, tomorrow, empty, failed }));

const token = process.env.GH_TOKEN, repo = process.env.GITHUB_REPOSITORY;
if (!token || !repo) process.exit(0);
const gh = async (method, path, body) => {
  const r = await fetch(`https://api.github.com/repos/${repo}${path}`, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? {} : r.json();
};
const open = (await gh('GET', '/issues?state=open&per_page=50')).filter((i) => i.title.startsWith(TITLE));
if (empty.length) {
  if (!open.length) {
    const body = [
      `На ${short(tomorrow)} нет готовой серии: ${empty.map((n) => '@' + n).join(', ')}.`,
      '',
      'Автор серий не прислал новых серий. Чаще всего причина в том, что облачные задачи Claude (serials-writer, serials-replier) остались на другом аккаунте Claude или кончился лимит.',
      'Что сделать: открыть сессию Claude на Маке и написать «проверь автономность» — задачи пересоздаются, автор запускается вручную.',
      failed.length ? `\nСерии, которые не собрались:\n- ${failed.join('\n- ')}` : '',
    ].join('\n');
    const i = await gh('POST', '/issues', { title: `${TITLE} (${short(tomorrow)})`, body });
    console.log(`issue opened: ${i.html_url}`);
  } else console.log(`issue already open: ${open[0].html_url}`);
} else {
  for (const i of open) {
    await gh('POST', `/issues/${i.number}/comments`, { body: `Серии на ${short(tomorrow)} есть у всех аккаунтов, закрываю.` });
    await gh('PATCH', `/issues/${i.number}`, { state: 'closed' });
    console.log(`issue closed: ${i.html_url}`);
  }
}
