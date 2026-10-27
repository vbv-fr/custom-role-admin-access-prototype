/* Shared bits for the "Custom roles: admin & tool access" prototype screens.
   Look copied from frinksvision-frontend (FP-3780 branch): tailwind.config.js,
   src/shared/layouts/main/{sidebar,heading}.tsx, src/shared/ui/*, src/shared/components/Tooltip.tsx. */

/* ---------- Tailwind (same colours as tailwind.config.js) ---------- */
if (window.tailwind) {
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          'f-primary': '#ff4301',
          'f-secondary': '#ff4301',
          'f-flat': '#fadbce',
          'f-light': '#fdece5f5',
          'f-gray': '#E5E5E5',
          'f-light-gray': '#D9D9D9',
          'f-dark-gray': '#7A7E80',
          'f-light-purple': '#C6C4FF',
        },
      },
    },
  };
}

const CRA = (window.CRA = {});

/* ---------- URL params ---------- */
const params = new URLSearchParams(location.search);
CRA.mode = params.get('mode') === 'today' ? 'today' : 'after';
CRA.state = params.get('state') || '';
CRA.after = CRA.mode === 'after';
CRA.embedded = window.self !== window.top;

/* ---------- Shared state (localStorage "cra-proto") ---------- */
CRA.KEY = 'cra-proto';
CRA.defaults = () => ({
  role: {
    name: 'Line Lead',
    desc: 'Line supervisor',
    perms: { project: [], recipe: [], datasets: [], annotation: ['write'], models: [], instances: [] },
    manageUsers: 'plant',
    plantsCreate: true,
    tools: { edge: false, license: false, manual: true },
    deleted: false,
  },
  assignedToKavya: true,
});
CRA.load = () => {
  const d = CRA.defaults();
  try {
    const raw = localStorage.getItem(CRA.KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    const role = Object.assign({}, d.role, s.role || {});
    role.perms = Object.assign({}, d.role.perms, (s.role || {}).perms || {});
    role.tools = Object.assign({}, d.role.tools, (s.role || {}).tools || {});
    return { role, assignedToKavya: s.assignedToKavya === undefined ? d.assignedToKavya : !!s.assignedToKavya };
  } catch (e) {
    return d;
  }
};
CRA.save = (s) => {
  try { localStorage.setItem(CRA.KEY, JSON.stringify(s)); } catch (e) { /* private window: keep going */ }
};
CRA.onStateChange = (fn) => window.addEventListener('storage', (e) => { if (e.key === CRA.KEY || e.key === null) fn(); });

/* ---------- Catalogue (frinksvision-backend src/access/catalogue.ts) ---------- */
CRA.AREAS = ['project', 'recipe', 'datasets', 'annotation', 'models', 'instances'];
CRA.AREA_ACTIONS = {
  project: ['create', 'edit', 'delete'],
  recipe: ['create', 'edit', 'delete'],
  datasets: ['create', 'edit', 'delete', 'download'],
  annotation: ['write'],
  models: ['create', 'edit', 'delete'],
  instances: ['create', 'edit', 'delete', 'download'],
};
CRA.BUILTINS = [
  { key: 'manage_users_org', name: 'Manage Users – Organisation', description: 'Add, edit and delete users in any plant' },
  { key: 'manage_users_plant', name: 'Manage Users – Plant', description: 'Add, edit and delete users in their own plant' },
  { key: 'manage_plants_teams', name: 'Manage Plants & Teams', description: 'Add new plants and teams' },
  { key: 'project', name: 'Project Management', description: 'Create, edit and delete projects; manage access', area: 'project' },
  { key: 'recipe', name: 'Recipe Management', description: 'Create, edit and delete recipes (captures)', area: 'recipe' },
  { key: 'datasets', name: 'Datasets Management', description: 'Datasets and images; download images', area: 'datasets' },
  { key: 'annotation', name: 'Annotation', description: 'Annotate, auto-annotate, edit and delete annotations', area: 'annotation' },
  { key: 'models', name: 'AI Models', description: 'Train models, edit thresholds, delete models', area: 'models' },
  { key: 'instances', name: 'Instance Management', description: 'Instances in their own plant and team', area: 'instances' },
  { key: 'edge_download', name: 'FrinksEdge Download', description: 'Opens the FrinksEdge Download page' },
  { key: 'demo_license', name: 'Download Demo License', description: 'Shows the Download Demo License button' },
  { key: 'manual_assistant', name: 'Manual Assistant', description: 'Opens the Manual Assistant chatbot and manuals' },
];
CRA.ORG_ADMIN = { key: 'org_admin', name: 'Org Admin', description: 'Every project, every permission, all users' };
CRA.VIEWER = { key: 'viewer', name: 'Viewer', description: 'View access to every section of the projects they’re on' };

const emptyPerms = () => ({ project: [], recipe: [], datasets: [], annotation: [], models: [], instances: [] });
const noTools = () => ({ edge: false, license: false, manual: false });

/* Full grid of a built-in role. Today the 6 non-project built-ins come back with no permissions
   (frinksvision-backend src/service/role.ts:28-31), so their grid is empty. */
CRA.builtinGrid = (key, after) => {
  const g = { perms: emptyPerms(), manageUsers: 'none', plantsCreate: false, tools: noTools() };
  if (key === 'org_admin') {
    CRA.AREAS.forEach((a) => (g.perms[a] = CRA.AREA_ACTIONS[a].slice()));
    if (after) Object.assign(g, { manageUsers: 'org', plantsCreate: true, tools: { edge: true, license: true, manual: true } });
    return g;
  }
  const b = CRA.BUILTINS.find((r) => r.key === key);
  if (b && b.area) g.perms[b.area] = CRA.AREA_ACTIONS[b.area].slice();
  if (!after) return g;
  if (key === 'manage_users_org') g.manageUsers = 'org';
  if (key === 'manage_users_plant') g.manageUsers = 'plant';
  if (key === 'manage_plants_teams') g.plantsCreate = true;
  if (key === 'edge_download') g.tools.edge = true;
  if (key === 'demo_license') g.tools.license = true;
  if (key === 'manual_assistant') g.tools.manual = true;
  return g;
};

/* What Kavya (who holds only the custom role) can do. Today a custom role can't carry the 6 abilities. */
CRA.kavyaAccess = (s) => {
  const holds = s.assignedToKavya && !s.role.deleted;
  const a = { holds, scope: null, plants: false, edge: false, license: false, manual: false, perms: holds ? s.role.perms : emptyPerms() };
  if (!holds || !CRA.after) return a;
  a.scope = s.role.manageUsers === 'none' ? null : s.role.manageUsers;
  a.plants = !!s.role.plantsCreate;
  a.edge = !!s.role.tools.edge;
  a.license = !!s.role.tools.license;
  a.manual = !!s.role.tools.manual;
  return a;
};

/* Greyed-control tooltips: same wording in both modes (PM, 28 Oct): the real text from
   src/core/access.ts needRole() and src/modules/roles-permissions/user/index.tsx:129. */
CRA.msg = {
  addUser: 'You need Manage Users – Organisation or Manage Users – Plant to add users.',
  addPlant: 'You need Manage Plants & Teams to add plants.',
  addTeam: 'You need Manage Plants & Teams to add teams.',
  edge: 'You need the FrinksEdge Download role.',
  license: 'You need the Download Demo License role.',
  manual: 'You need the Manual Assistant role.',
};

/* ---------- Sample data ---------- */
CRA.ORG = 'Northwind Plastics';
CRA.PLANTS = [
  { id: 'chennai', name: 'Chennai', location: 'Sriperumbudur, Tamil Nadu' },
  { id: 'pune', name: 'Pune', location: 'Chakan, Maharashtra' },
];
CRA.TEAMS = [
  { id: 'line1', name: 'Line 1' },
  { id: 'line2', name: 'Line 2' },
  { id: 'paint', name: 'Paint Shop' },
];

/* ---------- Escaping ---------- */
CRA.esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Icons (react-icons / feather / lucide paths) ---------- */
const svg = (vb, body, size, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}" ${extra}>${body}</svg>`;
const feather = (body, size = 16, cls = '') => svg('0 0 24 24', body, size, `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}"`);
CRA.icon = {
  info: (size = 16) => svg('0 0 24 24', '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>', size, 'fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"'),
  lock: (cls = '') => feather('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>', '1em', cls),
  eye: () => feather('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>', '1em'),
  edit: () => feather('<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>', '1em'),
  mail: () => feather('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>', '1em'),
  userX: () => feather('<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>', '1em'),
  users: (s = 14) => feather('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', s),
  circle: (s = 28, cls = '') => feather('<circle cx="12" cy="12" r="10"/>', s, cls),
  chevDown: () => feather('<polyline points="6 9 12 15 18 9"/>', 16),
  chevUp: () => feather('<polyline points="18 15 12 9 6 15"/>', 16),
  trash: (s = '1em') => svg('0 0 448 512', '<path fill="currentColor" d="M170.5 51.6L151.5 80h145l-19-28.4c-1.5-2.2-4-3.6-6.7-3.6H177.1c-2.7 0-5.2 1.3-6.7 3.6zm147-26.6L354.2 80H368h48 8c13.3 0 24 10.7 24 24s-10.7 24-24 24h-8V432c0 44.2-35.8 80-80 80H112c-44.2 0-80-35.8-80-80V128H24c-13.3 0-24-10.7-24-24S10.7 80 24 80h8H80 93.8l36.7-55.1C140.9 9.4 158.4 0 177.1 0h93.7c18.7 0 36.2 9.4 46.6 24.9zM80 128V432c0 17.7 14.3 32 32 32H336c17.7 0 32-14.3 32-32V128H80zm80 64V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16zm80 0V400c0 8.8-7.2 16-16 16s-16-7.2-16-16V192c0-8.8 7.2-16 16-16s16 7.2 16 16z"/>', s),
  dots: (s = 18) => svg('0 0 20 20', '<path fill="currentColor" d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>', s, 'class="cursor-pointer"'),
  close: (s = 20) => svg('0 0 512 512', '<path fill="currentColor" d="M289.94 256l95-95A24 24 0 00351 127l-95 95-95-95a24 24 0 00-34 34l95 95-95 95a24 24 0 1034 34l95-95 95 95a24 24 0 0034-34z"/>', s),
  check: (s = 12) => svg('0 0 512 512', '<path fill="currentColor" d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z"/>', s),
  send: (s = '1em') => svg('0 0 512 512', '<path fill="currentColor" d="M48 448l416-192L48 64v149.333L346 256 48 298.667z"/>', s),
  download: (s = '1em') => svg('0 0 512 512', '<path fill="currentColor" d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zm-124 88c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20zm64 0c0-11-9-20-20-20s-20 9-20 20 9 20 20 20 20-9 20-20z"/>', s),
  stepCheck: () => '<svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg" class="absolute left-[7px] top-[8.5px]"><path d="M13 1.5L4.75 9.75L1 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* InfoTooltip: grey "i" next to headings / labels / table headers. */
CRA.infoTip = (text, { size = 16, cls = 'text-gray-500', pos = 'top' } = {}) =>
  text ? `<span class="relative inline-flex items-center"><span data-tip="${CRA.esc(text)}" data-tip-pos="${pos}" class="inline-flex shrink-0 items-center justify-center rounded-full ${cls}">${CRA.icon.info(size)}</span></span>` : '';

/* ---------- Common widgets (markup copied from src/shared/ui) ---------- */
// Checkbox.tsx
CRA.checkbox = (checked, disabled, attrs = '') => {
  const base = `border border-f-light-gray shadow shadow-f-dark-gray rounded-md w-6 flex items-center justify-center h-6 ${disabled ? 'shadow-none' : 'cursor-pointer'}`;
  const bg = checked ? 'bg-f-primary' : 'bg-white';
  return `<label class="${base} ${bg}${disabled && checked ? ' bg-gray-400' : ''}" ${attrs}>${checked ? `<span class="text-white">${CRA.icon.check(12)}</span>` : ''}</label>`;
};
// Toggle.tsx
CRA.toggle = (isOn, disabled, attrs = '') =>
  `<div class="flex h-6 w-12 shrink-0 items-center rounded-full p-1 px-0 ${!disabled && isOn ? 'bg-[#ff4301]' : 'bg-gray-300'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}" ${attrs}><div class="h-5 w-5 transform rounded-full ${disabled ? 'bg-gray-200' : 'bg-white'} shadow-md transition-transform ${isOn ? 'translate-x-6' : 'translate-x-0'}"></div></div>`;
// Button.tsx (primary / border variants, sizes lg + md)
CRA.button = (label, { variant = '', size = 'lg', disabled = false, attrs = '', cls = '', full = false } = {}) => {
  const sizes = { lg: 'text-sm px-6 py-2 rounded-md', md: 'text-sm px-3 py-1.5 rounded-md' };
  let color = 'bg-f-primary text-white hover:bg-f-primary/90';
  if (variant === 'border') color = 'bg-transparent border hover:opacity-70 border-f-primary text-f-primary hover:bg-white/90';
  if (disabled) color = 'bg-gray-300 text-gray-500 cursor-not-allowed border-transparent';
  return `<button type="button" class="font-semibold shadow-xs h-fit cursor-pointer border ${variant === 'border' && !disabled ? '' : 'border-transparent'} ${sizes[size]} ${color} ${full ? 'w-full' : ''} ${cls}" ${disabled ? 'disabled' : ''} ${attrs}>${label}</button>`;
};
// Gated.tsx: greyed wrapper with hover reason
CRA.gated = (allowed, message, inner, cls = '', pos = 'top') =>
  allowed ? inner : `<div class="relative inline-flex cursor-not-allowed items-center ${cls}" aria-disabled="true" data-tip="${CRA.esc(message)}" data-tip-pos="${pos}"><div class="pointer-events-none select-none opacity-50">${inner}</div></div>`;
// heading.tsx
CRA.heading = (title, info, action, extraInfo = {}) => `
  <div class="flex items-center justify-between mt-1 gap-2 h-[60px] px-5 bg-white py-4">
    <div class="flex items-baseline gap-2">
      <div class="text-3xl font-medium flex items-center gap-1.5">${CRA.esc(title)}${CRA.infoTip(info, { size: 18, ...extraInfo })}</div>
      <div class="flex items-baseline text-xl font-medium gap-2"></div>
    </div>
    <div>${action || ''}</div>
  </div>`;
// Table.tsx header cell
CRA.th = (label, info, idx, last) => `
  <th scope="col" class="group sticky top-0 z-10 px-2 py-2 pt-4 pb-4 text-center text-base font-medium text-white">
    ${info ? `<span class="inline-flex items-center justify-center gap-1 whitespace-nowrap">${CRA.esc(label)}${CRA.infoTip(info, { cls: 'text-white' })}</span>` : CRA.esc(label)}
    ${idx !== undefined && !last ? '<div class="absolute top-2.5 right-0 bottom-2.5 w-0.5 cursor-col-resize rounded-2xl bg-white"></div>' : ''}
  </th>`;
CRA.td = (inner, cls = '') => `<td class="px-2 py-2 text-black overflow-visible ${cls}"><div class="flex h-full w-full items-center justify-center text-center">${inner}</div></td>`;
CRA.table = (cols, widths, head, body) => `
  <div class="flow-root h-full w-full overflow-x-auto"><div class="w-max min-w-full">
    <table class="min-w-full max-h-full divide-y divide-gray-300" style="width:100%">
      <colgroup>${cols.map((_, i) => `<col style="width:${widths && widths[i] ? (typeof widths[i] === 'string' ? widths[i] : widths[i] + 'px') : 'auto'}">`).join('')}</colgroup>
      <thead class="sticky top-0 z-10"><tr class="bg-f-primary relative">${head}</tr></thead>
      <tbody class="max-h-full divide-y divide-gray-200 overflow-y-auto bg-white">${body}</tbody>
    </table>
  </div></div>`;
// RowMenu.tsx trigger
CRA.rowMenu = (id, hasItems) =>
  hasItems ? `<div class="flex w-full justify-center"><div class="relative flex w-fit justify-end rounded-md px-[2px] py-1 hover:bg-gray-100" aria-label="Row actions" data-act="menu" data-id="${id}">${CRA.icon.dots(18)}</div></div>` : '';
CRA.rowMenuList = (items, rect) => {
  const top = rect.bottom + window.scrollY;
  const left = rect.right - 144;
  return `<ul class="fixed z-[9999] flex flex-col rounded-md bg-white drop-shadow-2xl overflow-hidden w-36 border border-gray-200 text-gray-600" style="top:${top}px;left:${left}px" data-menu-list>
    ${items.map((it, i) => `<li class="flex cursor-pointer items-center gap-2 p-2 text-xs hover:bg-gray-100 ${it.danger ? 'text-red-500' : ''}" data-act="menu-item" data-idx="${i}">${it.icon || ''} ${CRA.esc(it.label)}</li>`).join('')}
  </ul>`;
};
// Modal.tsx
CRA.modal = (title, body, footer, info) => `
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" role="dialog" aria-modal="true" data-act="modal-backdrop">
    <div class="relative w-full max-w-md transform rounded-lg bg-white shadow-lg outline-none" data-stop>
      <div class="flex items-center justify-between border-b-[1px] p-5">
        <h3 class="font-semibold flex items-center gap-1.5">${CRA.esc(title)}${CRA.infoTip(info)}</h3>
        <span class="cursor-pointer" data-act="modal-close">${CRA.icon.close(16)}</span>
      </div>
      <div class="overflow-auto p-5">${body}</div>
      <div class="border-t-[1px] p-5">${footer}</div>
    </div>
  </div>`;
// Label.tsx
CRA.label = (text, info) => `<label class="inline-block text-black select-none cursor-pointer mb-1 text-sm font-semibold">${info ? `<span class="inline-flex items-center gap-1">${CRA.esc(text)} <span class="text-red-500"></span>${CRA.infoTip(info)}</span>` : `${CRA.esc(text)} <span class="text-red-500"></span>`}</label>`;
// Input.tsx
CRA.input = (value, { placeholder = 'Placeholder text', disabled = false, attrs = '', error = '' } = {}) => `
  <div class="relative group">
    <input type="text" class="rounded-md border w-full outline-1 placeholder:text-gray-400 focus:outline-[2px] text-sm font-normal px-3 py-2 ${error ? 'border-red-500 focus:outline-red-500' : 'focus:border-f-primary focus:outline-f-primary'} ${disabled ? 'bg-[#fafafa] text-gray-500' : ''}" placeholder="${CRA.esc(placeholder)}" value="${CRA.esc(value)}" ${disabled ? 'disabled' : ''} ${attrs}>
    ${error ? `<p class="text-xs text-red-500 mt-1">${CRA.esc(error)}</p>` : '<p class="text-xs text-white"></p>'}
  </div>`;

/* ---------- Sidebar (src/shared/layouts/main/sidebar.tsx) ---------- */
CRA.sidebarUI = { collapsed: false, open: {} };
CRA.sidebar = ({ active, user, access }) => {
  const ui = CRA.sidebarUI;
  const c = ui.collapsed;
  const edgeReason = access.edge ? '' : CRA.msg.edge;
  const manualReason = access.manual ? '' : CRA.msg.manual;
  const groupOf = { plants: 1, teams: 1, users: 2, roles: 2 };
  if (ui.open.__init !== true) {
    ui.open.__init = true;
    if (groupOf[active] !== undefined) ui.open[groupOf[active]] = true;
  }
  const projIcon = '<svg width="22" height="22" viewBox="0 0 20 16"><path fill="#f4f7f7" d="M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H7L8.5 3H17C17.8284 3 18.5 3.67157 18.5 4.5V13C18.5 13.8284 17.8284 14.5 17 14.5H3C2.17157 14.5 1.5 13.8284 1.5 13V3Z"/></svg>';
  const teamIcon = (a) => `<svg width="24" height="24" viewBox="0 0 20 20"><path fill="${a ? 'currentColor' : '#f4f7f7'}" d="M10 1.5C5.305 1.5 1.5 5.305 1.5 10C1.5 14.695 5.305 18.5 10 18.5C14.695 18.5 18.5 14.695 18.5 10C18.5 5.305 14.695 1.5 10 1.5ZM10 5.5C11.381 5.5 12.5 6.619 12.5 8C12.5 9.381 11.381 10.5 10 10.5C8.619 10.5 7.5 9.381 7.5 8C7.5 6.619 8.619 5.5 10 5.5ZM10 16.5C7.75 16.5 5.77 15.37 4.5 13.64C4.525 11.98 7.5 11.07 10 11.07C12.485 11.07 15.475 11.98 15.5 13.64C14.23 15.37 12.25 16.5 10 16.5Z"/></svg>`;
  const usersIcon = (a) => `<svg width="20" height="16" viewBox="0 0 20 16" fill="none"><path fill="${a ? 'currentColor' : '#f4f7f7'}" d="M19 0.5H1C0.801088 0.5 0.610322 0.579018 0.46967 0.71967C0.329018 0.860322 0.25 1.05109 0.25 1.25V14.75C0.25 14.9489 0.329018 15.1397 0.46967 15.2803C0.610322 15.421 0.801088 15.5 1 15.5H19C19.1989 15.5 19.3897 15.421 19.5303 15.2803C19.671 15.1397 19.75 14.9489 19.75 14.75V1.25C19.75 1.05109 19.671 0.860322 19.5303 0.71967C19.3897 0.579018 19.1989 0.5 19 0.5ZM6.25 9.5V6.5H13.75V9.5H6.25ZM1.75 9.5V6.5H4.75V9.5H1.75ZM15.25 6.5H18.25V9.5H15.25V6.5ZM18.25 5H10.75V2H18.25V5ZM9.25 2V5H1.75V2H9.25ZM1.75 11H9.25V14H1.75V11ZM10.75 14V11H18.25V14H10.75Z"/></svg>`;
  const chatIcon = (a) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="${a ? 'currentColor' : '#f4f7f7'}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const edgeIcon = () => `<img src="${CRA_ASSETS.edgeIcon}" class="h-8 w-8 object-contain brightness-0 invert" alt="FrinksEdge Download">`;
  const menus = [
    { title: 'Projects', key: 'projects', icon: () => projIcon },
    { title: 'Teams & Plants', icon: teamIcon, children: [{ title: 'Plants', key: 'plants' }, { title: 'Teams', key: 'teams' }] },
    { title: 'Users & Permissions', icon: usersIcon, info: 'Invite people and define roles — reusable bundles of view, edit, create, delete and download rights.', children: [{ title: 'Users', key: 'users' }, { title: 'Roles', key: 'roles' }] },
    { title: 'FrinksEdge Download', key: 'edge', reason: edgeReason, icon: edgeIcon },
    { title: 'Manual Assistant', reason: manualReason, icon: chatIcon, children: [{ title: 'Chatbot', key: 'chat', reason: manualReason }, { title: 'View Manuals', key: 'manuals', reason: manualReason }] },
  ];
  const label = (t) => `<span class="text-lg transition-all duration-300 ${c ? 'w-0 opacity-0' : 'ml-4 opacity-100'}">${CRA.esc(t)}</span>`;
  const items = menus.map((m, index) => {
    if (m.children) {
      const childActive = m.children.some((ch) => ch.key === active);
      const isOpen = !!ui.open[index];
      const head = `
        <div class="group flex ${m.reason ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} items-center rounded-md py-2 duration-300 ${c ? 'justify-center' : 'mr-6 justify-between px-2'} text-white overflow-hidden" data-act="sb-toggle" data-idx="${index}" ${m.reason ? `data-tip="${CRA.esc(m.reason)}" data-tip-pos="right"` : ''}>
          <div class="flex items-center gap-0">
            <div class="flex w-8 shrink-0 items-center justify-center">${m.icon(childActive)}</div>
            ${!c && m.info ? `<span class="ml-4 flex items-center gap-1.5 text-lg opacity-100">${CRA.esc(m.title)}${CRA.infoTip(m.info, { cls: 'text-white', pos: 'right' })}</span>` : label(m.title)}
          </div>
          ${!c ? `<div class="ml-auto opacity-0 transition-opacity duration-300 group-hover:opacity-100">${isOpen ? CRA.icon.chevUp() : CRA.icon.chevDown()}</div>` : ''}
        </div>`;
      const kids = !c && isOpen ? `<ul class="mt-2 flex flex-col gap-2">${m.children.map((ch) => ch.reason
        ? `<li><div class="ml-6 mr-6 flex cursor-not-allowed items-center gap-0 rounded-md px-2 py-2 text-sm text-white opacity-50" data-tip="${CRA.esc(ch.reason)}" data-tip-pos="right"><div class="flex w-8 shrink-0 items-center justify-center"></div><span>${CRA.esc(ch.title)}</span></div></li>`
        : `<li><a class="${ch.key === active ? 'active bg-white/20' : 'hover:bg-white/20'} ml-6 mr-6 flex cursor-pointer items-center gap-0 rounded-md px-2 py-2 duration-100 text-white overflow-hidden text-sm" data-act="sb-link" data-key="${ch.key}"><div class="flex w-8 shrink-0 items-center justify-center"></div><span>${CRA.esc(ch.title)}</span></a></li>`).join('')}</ul>` : '';
      return `<li class="group relative flex flex-col rounded-lg transition-all duration-300 hover:bg-white/10 ${isOpen ? 'pb-3' : ''}">${head}${kids}</li>`;
    }
    if (m.reason) {
      return `<li class="group relative"><div class="flex cursor-not-allowed items-center gap-0 rounded-md py-2 text-white opacity-50 ${c ? 'justify-center' : 'mr-6 px-2'} overflow-hidden" data-tip="${CRA.esc(m.reason)}" data-tip-pos="right"><div class="flex w-8 shrink-0 items-center justify-center">${m.icon(false)}</div>${label(m.title)}</div></li>`;
    }
    return `<li class="group relative"><a class="${m.key === active ? 'active' : ''} flex cursor-pointer items-center gap-0 rounded-md py-2 duration-300 ${c ? 'justify-center' : 'mr-6 px-2'} text-white hover:bg-white/20 overflow-hidden" data-act="sb-link" data-key="${m.key}"><div class="flex w-8 shrink-0 items-center justify-center">${m.icon(m.key === active)}</div>${label(m.title)}</a></li>`;
  }).join('');
  const userBox = c ? '' : `
    <div class="flex flex-col" style="width:100%">
      <div class="flex w-full cursor-pointer items-center justify-between gap-4 px-2 border border-gray-700 rounded-lg p-2">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-200 font-semibold">${CRA.esc(user[0])}</div>
        <div class="grow min-w-0">
          <div class="text-white truncate font-medium">${CRA.esc(user)}</div>
          <div class="text-gray-400 text-xs truncate">${CRA.esc(CRA.ORG)}</div>
        </div>
        ${CRA.infoTip('Your account name and organization.', { cls: 'text-white', pos: 'top' })}
      </div>
    </div>`;
  const toggleSvg = c
    ? '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 18 8 13 3 8"></polyline><line x1="11" y1="9" x2="11" y2="17"></line><line x1="14" y1="9" x2="14" y2="17"></line></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="ml-auto"><line x1="3" y1="9" x2="3" y2="17"></line><line x1="6" y1="9" x2="6" y2="17"></line><polyline points="14 18 9 13 14 8"></polyline></svg>';
  return `
    <div class="fixed left-0 top-0 flex h-screen ${c ? 'w-[80px] px-2' : 'w-[350px] px-5'} flex-col items-center border-r border-r-gray-300 bg-[#1e1c1c] overflow-hidden whitespace-nowrap py-6 shadow-md transition-all duration-300" style="z-index:100">
      <a class="mb-10 mt-3 flex items-center justify-center overflow-hidden transition-all duration-300 ${c ? '' : '-ml-3'} cursor-pointer" data-act="sb-link" data-key="projects">
        <span class="cra-logo-wrap" style="display:block;width:${c ? 58 : 230}px">${CRA_ASSETS.logo}</span>
      </a>
      <ul class="mt-8 flex w-full flex-1 flex-col gap-2">${items}</ul>
      <div class="flex w-full flex-col gap-2">
        ${userBox}
        <button class="flex w-full items-center justify-center rounded-md py-2 text-white transition-colors hover:opacity-75" data-act="sb-collapse">${toggleSvg}</button>
      </div>
    </div>`;
};
CRA.mainClass = () => `h-full min-h-screen bg-white transition-all duration-300 ${CRA.sidebarUI.collapsed ? 'ml-[80px]' : 'ml-[350px]'}`;
// Returns true when the sidebar handled the click.
CRA.sidebarClick = (el, rerender, onLink) => {
  const act = el.dataset.act;
  if (act === 'sb-collapse') { CRA.sidebarUI.collapsed = !CRA.sidebarUI.collapsed; rerender(); return true; }
  if (act === 'sb-toggle') {
    const i = el.dataset.idx;
    if (CRA.sidebarUI.collapsed) CRA.sidebarUI.collapsed = false;
    CRA.sidebarUI.open[i] = !CRA.sidebarUI.open[i];
    rerender();
    return true;
  }
  if (act === 'sb-link') { if (onLink) onLink(el.dataset.key); return true; }
  return false;
};

/* ---------- Tooltip (same bubble as src/shared/components/Tooltip.tsx) ---------- */
(() => {
  let tipEl = null;
  let timer = null;
  let current = null;
  const hide = () => {
    clearTimeout(timer);
    current = null;
    if (tipEl) tipEl.remove();
    tipEl = null;
  };
  CRA.hideTip = hide;
  const place = (trigger, pos) => {
    const r = trigger.getBoundingClientRect();
    const t = tipEl.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, P = 8, G = 8;
    let top, left;
    if (pos === 'left' || pos === 'right') {
      let right = pos === 'right';
      if (right && r.right + G + t.width > vw - P) right = false;
      else if (!right && r.left - G - t.width < P) right = true;
      top = Math.min(Math.max(r.top + r.height / 2 - t.height / 2, P), Math.max(vh - P - t.height, P));
      left = right ? r.right + G : r.left - G - t.width;
    } else {
      let bottom = pos === 'bottom';
      if (bottom && r.bottom + G + t.height > vh - P) bottom = false;
      else if (!bottom && r.top - G - t.height < P) bottom = true;
      left = Math.min(Math.max(r.left + r.width / 2 - t.width / 2, P), Math.max(vw - P - t.width, P));
      top = bottom ? r.bottom + G : r.top - G - t.height;
    }
    tipEl.style.top = top + 'px';
    tipEl.style.left = left + 'px';
    tipEl.style.visibility = 'visible';
  };
  CRA.showTip = (trigger) => {
    hide();
    current = trigger;
    tipEl = document.createElement('div');
    tipEl.setAttribute('role', 'tooltip');
    tipEl.className = 'pointer-events-none w-max break-words whitespace-normal rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs text-gray-600 shadow-sm';
    tipEl.style.cssText = 'position:fixed;top:0;left:0;visibility:hidden;max-width:300px;z-index:99999';
    tipEl.textContent = trigger.getAttribute('data-tip');
    document.body.appendChild(tipEl);
    place(trigger, trigger.getAttribute('data-tip-pos') || 'top');
  };
  document.addEventListener('mouseover', (e) => {
    const trg = e.target.closest && e.target.closest('[data-tip]');
    if (trg === current) return;
    if (!trg) { hide(); return; }
    hide();
    current = trg;
    timer = setTimeout(() => { if (current === trg && document.body.contains(trg)) CRA.showTip(trg); }, 150);
  });
  document.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
})();

/* ---------- Toast (react-hot-toast default look) ---------- */
CRA.toast = (text) => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:100000;display:flex;align-items:center;gap:10px;background:#fff;color:#363636;line-height:1.3;padding:8px 10px;border-radius:8px;box-shadow:0 3px 10px rgba(0,0,0,.1),0 3px 3px rgba(0,0,0,.05);font-size:16px;max-width:350px;transition:opacity .3s';
  el.innerHTML = `<span style="width:20px;height:20px;border-radius:10px;background:#61d345;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="10" height="10" viewBox="0 0 14 11" fill="none"><path d="M13 1.5L4.75 9.75L1 6" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span style="margin:4px 10px">${CRA.esc(text)}</span>`;
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; }, 2200);
  setTimeout(() => el.remove(), 2600);
};

/* ---------- Navigation between steps ---------- */
CRA.STEP_URLS = {
  'roles-add': 'roles.html?state=add',
  'roles-view-builtin': 'roles.html?state=view-builtin',
  'user-assign': 'users.html?state=assign',
  'holder-users': 'users.html?state=holder',
  'holder-plants': 'plants.html?state=holder',
  'holder-tools': 'projects.html?state=holder',
};
CRA.nav = (to) => {
  if (CRA.embedded) window.parent.postMessage({ type: 'cra-nav', to }, '*');
  else location.href = `${CRA.STEP_URLS[to]}&mode=${CRA.mode}`;
};

/* ---------- Standalone Today | After switch (hidden inside the shell) ---------- */
CRA.mountModeSwitch = () => {
  if (CRA.embedded) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:12px;z-index:200000;display:flex;border:1px solid #d1d5db;border-radius:999px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.12);overflow:hidden;font:600 12px Outfit,sans-serif';
  ['today', 'after'].forEach((m) => {
    const b = document.createElement('button');
    b.textContent = m === 'today' ? 'Today' : 'After change';
    b.style.cssText = `padding:5px 12px;border:0;cursor:pointer;${CRA.mode === m ? 'background:#1e1c1c;color:#fff' : 'background:#fff;color:#374151'}`;
    b.onclick = () => { const p = new URLSearchParams(location.search); p.set('mode', m); location.search = p.toString(); };
    wrap.appendChild(b);
  });
  document.body.appendChild(wrap);
};

/* Keep scroll position of [data-keep-scroll] boxes across innerHTML re-renders. */
CRA.withScroll = (root, fn) => {
  const saved = {};
  root.querySelectorAll('[data-keep-scroll]').forEach((el) => (saved[el.dataset.keepScroll] = el.scrollTop));
  fn();
  root.querySelectorAll('[data-keep-scroll]').forEach((el) => { if (saved[el.dataset.keepScroll] !== undefined) el.scrollTop = saved[el.dataset.keepScroll]; });
};
