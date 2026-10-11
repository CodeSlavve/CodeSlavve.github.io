const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebarContent = document.querySelector(".sidebar-content");

function updateThemeButton(theme) {
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  const icon = createElement("span", `theme-icon theme-icon-${isDark ? "moon" : "sun"}`);
  icon.setAttribute("aria-hidden", "true");
  const label = createElement("span", "theme-toggle-label", isDark ? "Light" : "Dark");
  themeToggle.replaceChildren(icon, label);
}

updateThemeButton(root.dataset.theme);

themeToggle.addEventListener("click", () => {
  const theme = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = theme;
  updateThemeButton(theme);
  try {
    localStorage.setItem("theme", theme);
  } catch (error) {
    // The selected theme remains active for this page when storage is unavailable.
  }
});

const projects = [
  { label: "All projects", href: "/projects/", key: "projects" },
  {
    label: "CFPB Complaint Classifier",
    href: "/projects/cfpb-complaint-classifier.html",
    key: "cfpb",
    children: [
      { label: "Live demo", href: "/projects/cfpb-complaint-classifier-demo.html", key: "cfpb-demo" }
    ]
  },
  { label: "Phishing Website Detection", href: "/projects/phishing-website-detection.html", key: "phishing" },
  { label: "Machine Learning Projects", href: "/projects/machine-learning-projects.html", key: "ml-projects" },
  { label: "Samadhan Setu", href: "/projects/samadhan-setu.html", key: "samadhan-setu" }
];

const pageSections = {
  home: [
    { label: "About Me", id: "about" },
    { label: "Education", id: "education" },
    { label: "Projects", id: "projects" },
    { label: "Skills", id: "skills" },
    { label: "Contact", id: "contact" }
  ],
  projects: [{ label: "Projects", id: "projects" }],
  project: [
    { label: "Overview", id: "overview" },
    { label: "The problem", id: "problem" },
    { label: "How it works", id: "how-it-works" },
    { label: "Stack", id: "stack" },
    { label: "What I built", id: "what-i-built" },
    { label: "Challenges and what I learned", id: "challenges" },
    { label: "Links", id: "links" }
  ],
  demo: [
    { label: "Try it", id: "try-it" },
    { label: "About this demo", id: "about-demo" }
  ],
  notFound: [{ label: "Page not found", id: "not-found" }]
};

function normalizePath(pathname) {
  const normalized = pathname.replace(/\/+/g, "/");
  const path = normalized.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index.html") {
    return "/";
  }
  if (path.endsWith("/index.html")) {
    return path.slice(0, -"index.html".length);
  }
  return path.endsWith(".html") ? path : `${path}/`;
}

const currentPath = normalizePath(window.location.pathname);
const allProjects = projects.flatMap((project) => [project, ...(project.children || [])]);
const currentProject = allProjects.find((project) => project.href.endsWith(".html") && project.href === currentPath);
const pageType = currentPath === "/"
  ? "home"
  : currentPath === "/projects/"
    ? "projects"
    : currentPath === "/404.html"
      ? "notFound"
      : currentProject
        ? currentProject.key === "cfpb-demo" ? "demo" : "project"
        : "notFound";

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text) {
    element.textContent = text;
  }
  return element;
}

function renderSidebar() {
  const sectionNav = createElement("nav", "sidebar-group");
  sectionNav.setAttribute("aria-label", "Page sections");
  const sectionList = createElement("ul", "sidebar-list");
  const configuredSections = pageSections[pageType];
  const existingSections = configuredSections.filter(({ id }) => document.getElementById(id));

  existingSections.forEach(({ label, id }, index) => {
    const item = createElement("li");
    const link = createElement("a", "section-link", label);
    link.href = `#${id}`;
    if (index === 0) {
      link.setAttribute("aria-current", "location");
    }
    item.append(link);
    sectionList.append(item);
  });
  sectionNav.append(sectionList);

  sidebarContent.append(sectionNav);

  sidebarContent.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) {
      closeMobileSidebar();
    }
  });

  const sectionLinks = [...sectionList.querySelectorAll("a")];
  const sectionElements = existingSections.map(({ id }) => document.getElementById(id));
  function updateActiveSection() {
    if (!sectionElements.length) {
      return;
    }
    const activationLine = window.innerHeight * 0.2;
    let activeIndex = 0;
    sectionElements.forEach((section, index) => {
      if (section.getBoundingClientRect().top <= activationLine) {
        activeIndex = index;
      }
    });
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      activeIndex = sectionElements.length - 1;
    }
    sectionLinks.forEach((link, index) => {
      if (index === activeIndex) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  let scrollScheduled = false;
  function scheduleActiveSectionUpdate() {
    if (!scrollScheduled) {
      scrollScheduled = true;
      window.requestAnimationFrame(() => {
        updateActiveSection();
        scrollScheduled = false;
      });
    }
  }

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(scheduleActiveSectionUpdate, {
      rootMargin: "-20% 0px -65% 0px",
      threshold: 0
    });
    sectionElements.forEach((section) => sectionObserver.observe(section));
  }
  window.addEventListener("scroll", scheduleActiveSectionUpdate, { passive: true });
  window.addEventListener("hashchange", scheduleActiveSectionUpdate);
  updateActiveSection();
}

function setMobileSidebar(expanded) {
  sidebarToggle.setAttribute("aria-expanded", String(expanded));
  sidebarContent.classList.toggle("is-open", expanded);
}

function closeMobileSidebar(returnFocus = false) {
  setMobileSidebar(false);
  if (returnFocus) {
    sidebarToggle.focus();
  }
}

renderSidebar();
document.body.classList.add("sidebar-enhanced");
sidebarToggle.hidden = false;
setMobileSidebar(false);

sidebarToggle.addEventListener("click", () => {
  const expanded = sidebarToggle.getAttribute("aria-expanded") === "true";
  setMobileSidebar(!expanded);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sidebarToggle.getAttribute("aria-expanded") === "true") {
    closeMobileSidebar(true);
  }
});
