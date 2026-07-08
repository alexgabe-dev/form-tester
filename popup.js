const fillButton = document.querySelector("#fillForm");
const fillAndSubmitButton = document.querySelector("#fillAndSubmit");
const agreeCheckbox = document.querySelector("#agree");
const statusText = document.querySelector("#status");

async function runFill({ submit }) {
  setBusy(true);
  statusText.textContent = "Kitöltés folyamatban...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id) {
      throw new Error("Nem találtam aktív böngészőlapot.");
    }

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillApplicationForm,
      args: [{ submit, checkConsent: agreeCheckbox.checked }]
    });

    if (!result?.ok) {
      throw new Error(result?.message || "Nem sikerült kitölteni az űrlapot.");
    }

    const skipped = result.skippedUploads ? " A fájlfeltöltéseket kézzel kell megadni." : "";
    statusText.textContent = `${result.filledCount} mező kitöltve.${skipped}`;
  } catch (error) {
    statusText.textContent = error.message;
  } finally {
    setBusy(false);
  }
}

function setBusy(isBusy) {
  fillButton.disabled = isBusy;
  fillAndSubmitButton.disabled = isBusy;
}

fillButton.addEventListener("click", () => runFill({ submit: false }));
fillAndSubmitButton.addEventListener("click", () => runFill({ submit: true }));

function fillApplicationForm(options) {
  const rand = (items) => items[Math.floor(Math.random() * items.length)];
  const number = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pad = (value) => String(value).padStart(2, "0");
  const normalize = (value) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const firstNames = ["Anna", "Bence", "Csilla", "Dániel", "Eszter", "Gábor", "Hanna", "Levente", "Nóra", "Péter"];
  const lastNames = ["Kovács", "Nagy", "Tóth", "Szabó", "Horváth", "Varga", "Kiss", "Molnár", "Farkas", "Balogh"];
  const cities = ["Kecskemét", "Budapest", "Szeged", "Debrecen", "Győr", "Pécs", "Miskolc", "Nyíregyháza", "Szolnok", "Veszprém"];
  const regions = ["Bács-Kiskun", "Baranya", "Budapest", "Csongrád-Csanád", "Fejér", "Győr-Moson-Sopron", "Hajdú-Bihar", "Pest"];
  const domains = ["example.test", "teszt.hu", "mail.test", "demo.local"];
  const experienceTexts = [
    "2 év ügyfélszolgálati tapasztalat, napi adminisztráció, pontos adatrögzítés és alapvető Excel-használat.",
    "Korábban irodai asszisztensként dolgoztam, bejövő megkereséseket kezeltem és riportokat készítettem.",
    "Értékesítési támogatásban és ügyfélkapcsolati feladatokban szereztem gyakorlatot, gyorsan tanulok új rendszereket.",
    "Projektadminisztrációs és dokumentumkezelési tapasztalattal rendelkezem, önállóan és csapatban is magabiztosan dolgozom."
  ];

  const firstName = rand(firstNames);
  const lastName = rand(lastNames);
  const city = rand(cities);
  const year = number(1984, 2004);
  const month = number(1, 12);
  const day = number(1, 28);
  const token = `${Date.now().toString(36)}${number(100, 999)}`.toLowerCase();
  const values = {
    lastName,
    firstName,
    birthDateIso: `${year}-${pad(month)}-${pad(day)}`,
    birthDateText: `${year}-${pad(month)}-${pad(day)}`,
    birthPlace: city,
    phone: `+36 30 ${number(100, 999)} ${number(1000, 9999)}`,
    email: `${normalize(firstName)}.${normalize(lastName)}.${token}@${rand(domains)}`,
    region: rand(regions),
    settlement: city,
    experience: rand(experienceTexts)
  };

  const fields = Array.from(document.querySelectorAll("input, textarea, select")).filter((field) => {
    const type = normalize(field.type);
    return !field.disabled && !field.readOnly && !["hidden", "submit", "button", "reset"].includes(type);
  });

  let filledCount = 0;
  let skippedUploads = false;
  const filledFields = new WeakSet();

  const getLabelText = (field) => {
    const parts = [];

    if (field.id) {
      const explicitLabel = document.querySelector(`label[for="${CSS.escape(field.id)}"]`);
      if (explicitLabel) parts.push(explicitLabel.textContent);
    }

    const wrappingLabel = field.closest("label");
    if (wrappingLabel) parts.push(wrappingLabel.textContent);

    const row = field.closest(".form-group, .form-row, .field, .control-group, p, div, li");
    if (row) {
      const label = row.querySelector("label");
      if (label) parts.push(label.textContent);
      parts.push(row.textContent);
    }

    parts.push(field.name, field.id, field.placeholder, field.getAttribute("aria-label"));
    return normalize(parts.filter(Boolean).join(" "));
  };

  const setValue = (field, value) => {
    if (field.value === value) return;

    field.focus();
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "value")?.set;
    if (setter) {
      setter.call(field, value);
    } else {
      field.value = value;
    }

    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.blur();

    if (!filledFields.has(field)) {
      filledFields.add(field);
      filledCount += 1;
    }
  };

  const setChecked = (field, checked) => {
    if (field.checked === checked) return;

    field.focus();
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), "checked")?.set;
    if (setter) {
      setter.call(field, checked);
    } else {
      field.checked = checked;
    }

    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.blur();

    if (!filledFields.has(field)) {
      filledFields.add(field);
      filledCount += 1;
    }
  };

  const chooseSelect = (field, preferredValue) => {
    const options = Array.from(field.options).filter((option) => !option.disabled && option.value !== "");
    if (!options.length) return false;

    const preferred = options.find((option) => normalize(option.textContent).includes(normalize(preferredValue)));
    const selected = preferred || rand(options);
    setValue(field, selected.value);
    return true;
  };

  for (const field of fields) {
    const label = getLabelText(field);
    const tag = normalize(field.tagName);
    const type = normalize(field.type);

    if (type === "file") {
      skippedUploads = true;
      continue;
    }

    if (type === "checkbox") {
      if (options.checkConsent || label.includes("adatkezeles") || label.includes("hozzajarul")) {
        setChecked(field, true);
      }
      continue;
    }

    if (tag === "select") {
      chooseSelect(field, values.region);
      continue;
    }

    if (label.includes("vezetek")) {
      setValue(field, values.lastName);
    } else if (label.includes("kereszt")) {
      setValue(field, values.firstName);
    } else if (label.includes("szuletesi ido") || type === "date") {
      setValue(field, type === "date" ? values.birthDateIso : values.birthDateText);
    } else if (label.includes("szuletesi hely")) {
      setValue(field, values.birthPlace);
    } else if (label.includes("telefon") || type === "tel") {
      setValue(field, values.phone);
    } else if (label.includes("mail") || type === "email") {
      setValue(field, values.email);
    } else if (label.includes("regio")) {
      setValue(field, values.region);
    } else if (label.includes("telepules")) {
      setValue(field, values.settlement);
    } else if (label.includes("szakmai") || tag === "textarea") {
      setValue(field, values.experience);
    }
  }

  const visibleTextFields = fields.filter((field) => {
    const tag = normalize(field.tagName);
    const type = normalize(field.type);
    const rect = field.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    const isTextLike = tag === "textarea" || ["", "text", "search", "email", "tel", "url", "date", "number"].includes(type);
    return isVisible && isTextLike && type !== "file";
  });

  const orderedFallbackValues = [
    values.lastName,
    values.firstName,
    values.birthDateText,
    values.birthPlace,
    values.phone,
    values.email,
    values.settlement,
    values.experience
  ];

  for (let index = 0; index < visibleTextFields.length && index < orderedFallbackValues.length; index += 1) {
    const field = visibleTextFields[index];
    if (filledFields.has(field)) continue;

    const type = normalize(field.type);
    const fallbackValue = type === "date" && index === 2 ? values.birthDateIso : orderedFallbackValues[index];
    setValue(field, fallbackValue);
  }

  if (options.submit) {
    const buttons = Array.from(document.querySelectorAll("button, input[type='submit']"));
    const submitButton = buttons.find((button) => normalize(button.textContent || button.value).includes("jelentkezes elkuldese"))
      || buttons.find((button) => normalize(button.textContent || button.value).includes("elkuld"))
      || document.querySelector("form button[type='submit'], form input[type='submit']");

    if (submitButton) {
      submitButton.click();
    }
  }

  return {
    ok: filledCount > 0,
    filledCount,
    skippedUploads,
    message: filledCount > 0 ? "" : "Nem találtam kitölthető mezőket ezen az oldalon."
  };
}
