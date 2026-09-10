"use client";

import { useEffect, useState } from "react";

export default function EmailNotificationReminder() {
  const [open, setOpen] = useState(false);
  const [pendingForm, setPendingForm] = useState<HTMLFormElement | null>(null);

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("form");
    if (!form) return;

    const findEmailCheckbox = () =>
      Array.from(form.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).find((input) => {
        const text = input.parentElement?.textContent || "";
        return text.includes("Email me if my poll goes live") || text.includes("Email me with updates about my poll");
      });

    const emailCheckbox = findEmailCheckbox();
    const emailLabel = emailCheckbox?.parentElement;
    const emailText = emailLabel?.querySelector("span");

    if (emailText) {
      emailText.textContent = "Email me with updates about my poll";
    }

    if (emailLabel && !emailLabel.nextElementSibling?.classList.contains("poll-email-helper")) {
      const helper = document.createElement("p");
      helper.className = "poll-email-helper text-xs text-gray-300";
      helper.textContent =
        "We’ll let you know if it goes live publicly, or contact you if there’s an issue, clarification needed, or it can’t be published. No marketing.";
      emailLabel.insertAdjacentElement("afterend", helper);
    }

    const handleSubmit = (event: SubmitEvent) => {
      const currentEmailCheckbox = findEmailCheckbox();

      if (!currentEmailCheckbox || currentEmailCheckbox.checked || form.dataset.emailReminderConfirmed === "true") {
        delete form.dataset.emailReminderConfirmed;
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      setPendingForm(form);
      setOpen(true);
    };

    form.addEventListener("submit", handleSubmit, true);
    return () => form.removeEventListener("submit", handleSubmit, true);
  }, []);

  useEffect(() => {
    const improveSuccessSharing = () => {
      const headings = Array.from(document.querySelectorAll<HTMLHeadingElement>("h2"));
      const successHeading = headings.find((heading) => heading.textContent?.includes("Your poll is live"));
      if (!successHeading) return;

      const successPanel = successHeading.closest("div.space-y-5");
      if (!successPanel || successPanel.getAttribute("data-sharing-enhanced") === "true") return;

      successPanel.setAttribute("data-sharing-enhanced", "true");

      const intro = successHeading.parentElement?.querySelector("p");
      if (intro) {
        intro.textContent = "Get more people voting. Share your poll now and see what people really think.";
        intro.className = "text-sm text-gray-200 md:text-base";
      }

      const buttons = Array.from(successPanel.querySelectorAll<HTMLButtonElement>("button"));
      const copyButton = buttons.find((button) => button.textContent?.trim() === "Copy link");
      const shareButton = buttons.find((button) => button.textContent?.trim() === "Share");

      if (shareButton) {
        shareButton.textContent = "Share poll";
        shareButton.className =
          "w-full cursor-pointer rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 sm:flex-1";
      }

      if (copyButton) {
        copyButton.className =
          "w-full cursor-pointer rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800 sm:flex-1";
      }
    };

    improveSuccessSharing();
    const observer = new MutationObserver(improveSuccessSharing);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const continueWithoutEmail = () => {
    if (!pendingForm) return;
    pendingForm.dataset.emailReminderConfirmed = "true";
    setOpen(false);
    pendingForm.requestSubmit();
    setPendingForm(null);
  };

  const addEmail = () => {
    if (!pendingForm) return;
    const emailCheckbox = Array.from(pendingForm.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).find((input) => {
      const text = input.parentElement?.textContent || "";
      return text.includes("Email me if my poll goes live") || text.includes("Email me with updates about my poll");
    });

    setOpen(false);
    if (emailCheckbox && !emailCheckbox.checked) emailCheckbox.click();
    window.setTimeout(() => {
      pendingForm.querySelector<HTMLInputElement>('input[type="email"]')?.focus();
    }, 50);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4" role="dialog" aria-modal="true" aria-labelledby="email-reminder-title">
      <div className="w-full max-w-lg rounded-2xl border border-red-500/70 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 rounded-xl border border-red-500/60 bg-red-950/40 p-4">
          <h2 id="email-reminder-title" className="text-xl font-bold text-white">Please note before submitting</h2>
          <p className="mt-2 text-sm leading-6 text-gray-200">
            Without an email address, we cannot let you know if your poll is featured publicly, if we need clarification, or if it cannot be published for any reason.
          </p>
        </div>

        <p className="text-sm leading-6 text-gray-300">
          Your email is used only for updates about this poll. We will not use it for marketing or add you to a mailing list.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={addEmail} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-500">
            Add my email address
          </button>
          <button type="button" onClick={continueWithoutEmail} className="w-full rounded-xl border border-gray-600 bg-gray-800 px-5 py-3 font-medium text-gray-200 transition hover:bg-gray-700">
            Continue without email
          </button>
        </div>
      </div>
    </div>
  );
}