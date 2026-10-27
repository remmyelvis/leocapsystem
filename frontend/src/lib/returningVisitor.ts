// Has this browser signed in before? The applicant sign-in page shows its example card ("the statuses you will see on your
// dashboard") only to people it is new to; someone who already knows the dashboard just wants the form.
// Nothing personal is stored: a yes/no flag in this browser, never sent anywhere.

const KEY = "leocap_signed_in_before";

export function hasSignedInBefore(): boolean {
  try {
    // "leocap_user_company" has been written at every applicant / staff sign-in for a long time and is never cleared at
    // sign-out, so people who signed in before this flag existed already count as returning.
    return localStorage.getItem(KEY) === "1" || !!localStorage.getItem("leocap_user_company");
  } catch {
    return false; // storage blocked (private window): treat as new, they simply see the card
  }
}

export function rememberSignedIn() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // storage blocked: the card will show again next time, which is harmless
  }
}
