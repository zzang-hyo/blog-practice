const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT_DIR = __dirname;
const POSTS_DIR = path.join(ROOT_DIR, 'posts');
const TEMPLATES_DIR = path.join(ROOT_DIR, 'templates');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

function render(str, data) {
  return str.replace(/{{\s*(\w+)\s*}}/g, (_, key) => (data[key] !== undefined ? data[key] : ''));
}

function formatDate(dateInput) {
  return new Date(dateInput).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function tagsHtml(tags) {
  if (!tags || tags.length === 0) return '';
  const spans = tags.map((t) => `<span class="tag">#${t}</span>`).join('');
  return ` <span class="tags">${spans}</span>`;
}

function renderCard(post) {
  return `  <article class="post-card">
    <h2><a href="posts/${post.slug}.html">${post.title}</a></h2>
    <p class="post-meta"><time datetime="${post.date}">${post.dateDisplay}</time>${tagsHtml(post.tags)}</p>
    <p class="post-description">${post.description}</p>
  </article>`;
}

function loadPosts() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
    const { data, content } = matter(raw);
    const slug = file.replace(/\.md$/, '');

    return {
      slug,
      title: data.title || slug,
      date: data.date ? new Date(data.date).toISOString().slice(0, 10) : '',
      dateDisplay: data.date ? formatDate(data.date) : '',
      tags: data.tags || [],
      description: data.description || '',
      html: marked.parse(content),
    };
  });

  posts.sort((a, b) => (a.date < b.date ? 1 : -1));
  return posts;
}

function main() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST_DIR, 'posts'), { recursive: true });

  const layoutTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'layout.html'), 'utf-8');
  const postTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'post.html'), 'utf-8');
  const indexTpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'index.html'), 'utf-8');

  const posts = loadPosts();

  for (const post of posts) {
    const body = render(postTpl, {
      TITLE: post.title,
      DATE: post.date,
      DATE_DISPLAY: post.dateDisplay,
      TAGS_HTML: tagsHtml(post.tags),
      CONTENT: post.html,
    });
    const page = render(layoutTpl, {
      TITLE: post.title,
      DESCRIPTION: post.description,
      ROOT: '../',
      BODY: body,
    });
    fs.writeFileSync(path.join(DIST_DIR, 'posts', `${post.slug}.html`), page, 'utf-8');
  }

  const cards = posts.map(renderCard).join('\n');
  const indexBody = render(indexTpl, { POST_CARDS: cards });
  const indexPage = render(layoutTpl, {
    TITLE: 'My Blog',
    DESCRIPTION: 'Markdown으로 작성한 정적 블로그',
    ROOT: '',
    BODY: indexBody,
  });
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexPage, 'utf-8');

  fs.cpSync(ASSETS_DIR, path.join(DIST_DIR, 'assets'), { recursive: true });

  console.log(`Built ${posts.length} post(s) into dist/`);
}

main();
