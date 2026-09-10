/* ==========================================================================
   DENTIKA — script.js
   Vanilla JS, bez zavisnosti. Podeljeno u male, nezavisne funkcije:
   1. Mobilni hamburger meni
   2. Scroll-reveal animacije (IntersectionObserver)
   3. Forma za zakazivanje (Formspree/EmailJS integracija)
   4. Horizontalni album "Naš rad"
   5. Slideshow u sekciji "O nama"
   6. Klizač prije/poslije
   7. Sitni detalji (godina u footeru, min datum za termin)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initMobileMenu();
  initScrollReveal();
  initContactForm();
  initWorkAlbum();
  initAboutSlideshow();
  initBeforeAfterSlider();
  initFooterYear();
  initMinAppointmentDate();
});

/* --------------------------------------------------------------------------
   1. MOBILNI HAMBURGER MENI
   -------------------------------------------------------------------------- */
function initMobileMenu() {
  const hamburger = document.getElementById("hamburger");
  const nav = document.getElementById("glavni-meni");
  if (!hamburger || !nav) return;

  const closeMenu = () => {
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.setAttribute("aria-label", "Otvori meni");
    nav.classList.remove("is-open");
  };

  hamburger.addEventListener("click", () => {
    const isOpen = hamburger.getAttribute("aria-expanded") === "true";
    hamburger.setAttribute("aria-expanded", String(!isOpen));
    hamburger.setAttribute("aria-label", isOpen ? "Otvori meni" : "Zatvori meni");
    nav.classList.toggle("is-open", !isOpen);
  });

  // Zatvori meni kad korisnik klikne na neki link (mobilna navigacija)
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Zatvori meni na Escape radi pristupačnosti
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

/* --------------------------------------------------------------------------
   2. SCROLL-REVEAL ANIMACIJE
   Elementi sa klasom .reveal dobijaju .is-visible kad uđu u viewport.
   Pravac ulaska (gore/levo/desno/skaliranje) čita se iz data-reveal
   atributa direktno u CSS-u — ovde samo okidamo vidljivost.
   Poštuje prefers-reduced-motion (u tom slučaju CSS već isključuje animaciju,
   pa ovde samo odmah otkrivamo sve elemente bez posmatranja).
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!items.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  items.forEach((el) => observer.observe(el));
}

/* --------------------------------------------------------------------------
   3. FORMA ZA ZAKAZIVANJE
   Radi "progressive enhancement": ako JS ne uspe, forma i dalje radi kao
   običan POST (zahvaljujući action="..." atributu u HTML-u).
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById("contact-form");
  const status = document.getElementById("form-status");
  if (!form || !status) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Honeypot provera — ako je "website" polje popunjeno, verovatno je bot
    const honeypot = form.querySelector('input[name="website"]');
    if (honeypot && honeypot.value) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Slanje u toku...";
    status.textContent = "";
    status.className = "form-status";

    try {
      /* --------------------------------------------------------------
         PRILAGODI: Ovo je podrazumevana Formspree integracija.
         action="" atribut se čita direktno iz forme, pa je dovoljno da
         gore u HTML-u zameniš FORMSPREE_ENDPOINT_PLACEHOLDER svojim ID-jem.

         Ako umesto Formspree koristiš EmailJS, zameni blok ispod sa:

           await emailjs.sendForm("SERVICE_ID", "TEMPLATE_ID", form, "PUBLIC_KEY");

         (i uključi EmailJS SDK <script> tag u <head> stranice)
      -------------------------------------------------------------- */
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });

      if (response.ok) {
        status.textContent = "Hvala! Vaš zahtjev za termin je poslat — javićemo vam se uskoro.";
        status.classList.add("success");
        form.reset();
      } else {
        throw new Error("Slanje nije uspelo");
      }
    } catch (err) {
      status.textContent = "Došlo je do greške pri slanju. Pokušajte ponovo ili nas pozovite telefonom.";
      status.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });
}

/* --------------------------------------------------------------------------
   4. HORIZONTALNI ALBUM "NAŠ RAD"
   Strelice pomjeraju traku fotografija za onoliko kartica koliko ih je
   trenutno vidljivo u okviru (tipično 2-3), a ne samo za jednu — tako je
   pomak vidljiv i "osjeti se" kao prelazak na sljedeći set fotografija.
   -------------------------------------------------------------------------- */
function initWorkAlbum() {
  const scrollEl = document.getElementById("work-scroll");
  const prevBtn = document.getElementById("work-prev");
  const nextBtn = document.getElementById("work-next");
  if (!scrollEl || !prevBtn || !nextBtn) return;

  const gap = 20;

  const scrollByPage = (direction) => {
    const card = scrollEl.querySelector(".work-item");
    const cardWidth = card ? card.getBoundingClientRect().width + gap : 320;
    const visibleCount = Math.max(1, Math.round(scrollEl.clientWidth / cardWidth));
    // Pomjeri za jedan set vidljivih kartica manje jedne, da ostane blagi
    // preklop radi orijentacije (osjećaj kontinuiteta), min. 2 kartice.
    const step = Math.max(2, visibleCount - 1);
    scrollEl.scrollBy({ left: direction * step * cardWidth, behavior: "smooth" });
  };

  prevBtn.addEventListener("click", () => scrollByPage(-1));
  nextBtn.addEventListener("click", () => scrollByPage(1));
}

/* --------------------------------------------------------------------------
   5. SLIDESHOW U SEKCIJI "O NAMA"
   Automatska smjena fotografija sa fade prelazom, tačkice za ručni izbor,
   pauza na hover/fokus i poštovanje prefers-reduced-motion.
   -------------------------------------------------------------------------- */
function initAboutSlideshow() {
  const root = document.getElementById("about-slideshow");
  if (!root) return;

  const slides = Array.from(root.querySelectorAll(".slide"));
  const dots = Array.from(root.querySelectorAll(".dot"));
  if (!slides.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let current = slides.findIndex((s) => s.classList.contains("is-active"));
  if (current < 0) current = 0;
  let timer = null;

  const show = (index) => {
    slides[current].classList.remove("is-active");
    dots[current] && dots[current].classList.remove("is-active");
    dots[current] && dots[current].setAttribute("aria-selected", "false");

    current = (index + slides.length) % slides.length;

    slides[current].classList.add("is-active");
    dots[current] && dots[current].classList.add("is-active");
    dots[current] && dots[current].setAttribute("aria-selected", "true");
  };

  const start = () => {
    if (prefersReducedMotion || slides.length < 2) return;
    stop();
    timer = setInterval(() => show(current + 1), 2600);
  };
  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      show(Number(dot.dataset.index));
      start();
    });
  });

  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", start);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", start);

  start();
}

/* --------------------------------------------------------------------------
   6. KLIZAČ PRIJE / POSLIJE
   Graničnik prati kursor čim korisnik pređe mišem preko okvira — nije
   potrebno klikati ni prevlačiti. Na dodir (mobilni) prati prst dok se
   povlači. Kad miš napusti okvir, graničnik se vraća na sredinu. Range
   input ostaje kao pristupačna alternativa za tastaturu.
   -------------------------------------------------------------------------- */
function initBeforeAfterSlider() {
  const frame = document.getElementById("ba-frame");
  const range = document.getElementById("ba-range");
  const afterLayer = frame ? frame.querySelector(".ba-after") : null;
  const handle = document.getElementById("ba-handle");
  if (!frame || !range || !afterLayer || !handle) return;

  const update = (value) => {
    const v = Math.min(100, Math.max(0, value));
    afterLayer.style.clipPath = `inset(0 0 0 ${v}%)`;
    handle.style.left = `${v}%`;
  };

  range.addEventListener("input", () => update(Number(range.value)));

  const setFromClientX = (clientX) => {
    const rect = frame.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const value = Math.round(Math.min(100, Math.max(0, ratio * 100)));
    range.value = String(value);
    update(value);
  };

  // Praćenje kursora bez potrebe za klikom — hover je dovoljan.
  // Na dodirnim uređajima isti event prati prst dok je u kontaktu s ekranom.
  frame.addEventListener("pointermove", (e) => setFromClientX(e.clientX));

  // Kad miš napusti okvir, graničnik se vraća na sredinu.
  frame.addEventListener("pointerleave", (e) => {
    if (e.pointerType !== "mouse") return;
    range.value = "50";
    update(50);
  });

  update(Number(range.value));
}

/* --------------------------------------------------------------------------
   7. SITNI DETALJI
   -------------------------------------------------------------------------- */
function initFooterYear() {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}

function initMinAppointmentDate() {
  const input = document.getElementById("termin");
  if (!input) return;
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  input.min = now.toISOString().slice(0, 16);
}
