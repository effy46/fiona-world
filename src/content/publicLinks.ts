const base = import.meta.env.BASE_URL;

export const publicLinks = {
  emailAddress: 'fionabfeng@gmail.com',
  emailHref: 'mailto:fionabfeng@gmail.com',
  gitHubHref: 'https://github.com/effy46',
  linkedInHref: 'https://www.linkedin.com/in/fiona-b-feng/',
  pawPalHref: 'https://github.com/effy46/PawPal',
  // Enable only after adding an approved PDF to public/.
  resumePdfReady: false,
  resumePdfHref: `${base}resume.pdf`,
};

export function isPendingHref(href: string | undefined) {
  return !href || href.startsWith('#TODO');
}
