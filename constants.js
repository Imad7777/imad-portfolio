// =================================================================================
// 🟢 用户配置区域 (USER CONFIGURATION)
// 修改下面的内容来更新你的网站。
// =================================================================================

// 个人信息
const PROFILE = {
  name: "Alex Chen",
  role: "Senior Product Designer",
  tagline: "I craft digital experiences that blend aesthetics with functionality.",
  bio: "With over 8 years of experience in the design industry, I specialize in building clean, user-centric interfaces. My approach is rooted in design thinking and data-driven decisions. I believe that good design is invisible—it just works.",
  email: "hello@alexchen.design",
  location: "San Francisco, CA",
  availability: "Available for freelance projects",
};

// 技能列表
const SKILLS = [
  {
    category: "Design",
    items: ["UI/UX Design", "Design Systems", "Prototyping", "Wireframing", "Interaction Design", "Mobile App Design"]
  },
  {
    category: "Tools",
    items: ["Figma", "Adobe CC", "Principle", "Webflow", "Spline", "Blender"]
  },
  {
    category: "Development",
    items: ["HTML/CSS", "Tailwind CSS", "React Basics", "Git"]
  }
];

// 社交媒体链接
// icon 对应 Lucide 图标库的名字: https://lucide.dev/icons/
const SOCIAL_LINKS = [
  { platform: "Twitter", url: "https://twitter.com", icon: "twitter" },
  { platform: "LinkedIn", url: "https://linkedin.com", icon: "linkedin" },
  { platform: "Dribbble", url: "https://dribbble.com", icon: "dribbble" },
  { platform: "Instagram", url: "https://instagram.com", icon: "instagram" },
];

// 项目作品
// imageUrl 可以是网络图片地址，也可以是本地图片路径 (例如 './images/project1.jpg')
const PROJECTS = [
  {
    id: 1,
    title: "Fintech Dashboard",
    category: "UI/UX",
    description: "A comprehensive financial analytics platform for enterprise clients.",
    imageUrl: "https://picsum.photos/800/600?random=1",
    link: "#"
  },
  {
    id: 2,
    title: "EcoBrand Identity",
    category: "Branding",
    description: "Complete visual identity and brand guidelines for a sustainable clothing startup.",
    imageUrl: "https://picsum.photos/800/800?random=2",
    link: "#"
  },
  {
    id: 3,
    title: "Nebula Mobile App",
    category: "Product",
    description: "Meditation and sleep tracking application with over 1M downloads.",
    imageUrl: "https://picsum.photos/800/1000?random=3",
    link: "#"
  },
  {
    id: 4,
    title: "Abstract 3D Pack",
    category: "Illustration",
    description: "A collection of 3D assets created for a tech conference web experience.",
    imageUrl: "https://picsum.photos/800/600?random=4",
    link: "#"
  },
  {
    id: 5,
    title: "Urban Architecture",
    category: "Branding",
    description: "Website redesign and art direction for a leading architecture firm.",
    imageUrl: "https://picsum.photos/800/600?random=5",
    link: "#"
  },
  {
    id: 6,
    title: "HealthConnect",
    category: "UI/UX",
    description: "Telemedicine platform connecting patients with specialists worldwide.",
    imageUrl: "https://picsum.photos/800/800?random=6",
    link: "#"
  },
];

// 导航菜单
const NAV_LINKS = [
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" },
];