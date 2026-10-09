const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const sidebar = document.querySelector(".site-sidebar");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebarContent = document.querySelector(".sidebar-content");
const desktopSidebar = window.matchMedia("(min-width: 901px)");

function updateThemeButton(theme) {
  const isDark = theme === "dark";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  themeToggle.textContent = isDark ? "Light" : "Dark";
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
    { label: "Home", id: "home" },
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

function createCurrentItem(label, currentType) {
  const item = createElement("li");
  const current = createElement("span", "sidebar-current", label);
  current.setAttribute("aria-current", currentType);
  item.append(current);
  return item;
}

function createNavigationLink(label, href, className) {
  const item = createElement("li");
  const link = createElement("a", className, label);
  link.href = href;
  item.append(link);
  return item;
}

function createProjectEntry(project) {
  const isCurrent = currentProject && currentProject.key === project.key;
  const isCurrentListing = pageType === "projects" && project.key === "projects";
  const item = createElement("li");
  item.append(isCurrent || isCurrentListing
    ? createCurrentItem(project.label, "page").firstElementChild
    : createElement("a", "other-page-link", project.label));

  const link = item.querySelector("a");
  if (link) {
    link.href = project.href;
  }

  if (project.children) {
    const childList = createElement("ul", "project-grandchildren");
    project.children.forEach((child) => {
      const childItem = currentProject && child.key === currentProject.key
        ? createCurrentItem(child.label, "page")
        : createNavigationLink(child.label, child.href, "other-page-link");
      childList.append(childItem);
    });
    item.append(childList);
  }
  return item;
}

function renderSidebar() {
  const sectionNav = createElement("nav", "sidebar-group");
  sectionNav.setAttribute("aria-label", "On this page");
  sectionNav.append(createElement("h2", "sidebar-heading", "On this page"));
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

  const otherNav = createElement("nav", "sidebar-group");
  otherNav.setAttribute("aria-label", "Other pages");
  otherNav.append(createElement("h2", "sidebar-heading", "Other pages"));
  const otherList = createElement("ul", "sidebar-list other-pages-list");

  if (pageType !== "home") {
    otherList.append(createNavigationLink("Home", "/", "other-page-link"));
  }

  const projectItem = createElement("li", "project-tree");
  const projectParent = createElement("div", "project-parent");
  const projectLink = createElement("a", "other-page-link", "Projects");
  projectLink.href = "/projects/";
  const childrenId = "project-page-links";
  const projectExpanded = desktopSidebar.matches || pageType === "project" || pageType === "demo";
  const projectDisclosure = createElement("button", "tree-toggle", projectExpanded ? "-" : "+");
  projectDisclosure.type = "button";
  projectDisclosure.setAttribute("aria-controls", childrenId);
  projectDisclosure.setAttribute("aria-expanded", String(projectExpanded));
  projectDisclosure.setAttribute("aria-label", `${projectExpanded ? "Collapse" : "Expand"} project pages`);
  projectParent.append(projectLink, projectDisclosure);

  const children = createElement("ul", "project-children");
  children.id = childrenId;
  children.hidden = !projectExpanded;
  projects.forEach((project) => {
    children.append(createProjectEntry(project));
  });
  projectItem.append(projectParent, children);
  otherList.append(projectItem);
  otherNav.append(otherList);

  sidebarContent.append(sectionNav, otherNav);

  projectDisclosure.addEventListener("click", () => {
    const expanded = projectDisclosure.getAttribute("aria-expanded") === "true";
    setProjectDisclosure(!expanded);
  });

  sidebarContent.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a") && !desktopSidebar.matches) {
      closeMobileSidebar();
    }
  });

  const sectionLinks = [...sectionList.querySelectorAll("a")];
  const sectionElements = existingSections.map(({ id }) => document.getElementById(id));
  function updateActiveSection() {
    if (!sectionElements.length) {
      return;
    }
    const activationLine = window.innerHeight * 0.32;
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

function setProjectDisclosure(expanded) {
  const disclosure = sidebar.querySelector(".tree-toggle");
  const children = sidebar.querySelector(".project-children");
  disclosure.setAttribute("aria-expanded", String(expanded));
  disclosure.setAttribute("aria-label", `${expanded ? "Collapse" : "Expand"} project pages`);
  disclosure.textContent = expanded ? "-" : "+";
  children.hidden = !expanded;
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
setMobileSidebar(desktopSidebar.matches);

sidebarToggle.addEventListener("click", () => {
  const expanded = sidebarToggle.getAttribute("aria-expanded") === "true";
  setMobileSidebar(!expanded);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && sidebarToggle.getAttribute("aria-expanded") === "true" && !desktopSidebar.matches) {
    closeMobileSidebar(true);
  }
});

desktopSidebar.addEventListener("change", (event) => {
  if (event.matches) {
    setMobileSidebar(true);
    setProjectDisclosure(true);
  } else {
    setMobileSidebar(false);
    setProjectDisclosure(pageType === "project" || pageType === "demo");
  }
});
