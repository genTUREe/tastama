/* Enable public access/contact only after checking the destination.
   A preferred but unverified address must not be used as a contact channel. */
window.TASTAMA_CONFIG = {
  siteUrl: "https://tastama.tech",
  appUrl: "",
  appUrlVerified: false,
  contactEmail: "",
  contactEmailVerified: false,
  company: {
    name: "TASTAMA",
    industry: "EdTech / AI-powered Education",
    city: "Astana",
    country: "Kazakhstan",
    stage: "MVP / Early-stage Startup"
  },
  team: [
    {
      id: "sultan",
      name: "Залеш Сұлтан Сырымұлы",
      initials: "ЗС",
      roleKey: "team.role1",
      bioKey: "team.bio1",
      universityKey: "team.university1",
      github: "https://github.com/ZaleshSultan"
    },
    {
      id: "alinur",
      name: "Бердибек Алинур",
      initials: "БА",
      roleKey: "team.role2",
      bioKey: "team.bio2",
      universityKey: "team.university2"
    },
    {
      id: "akbar",
      name: "Муратов Акбар Отабекулы",
      initials: "МА",
      roleKey: "team.role3",
      bioKey: "team.bio3"
    },
    {
      id: "eskendir",
      name: "Иксанов Ескендір",
      initials: "ИЕ",
      roleKey: "team.role4",
      bioKey: "team.bio4"
    }
  ]
};
