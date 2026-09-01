"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Bell,
  Users,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { TurnstileWidget } from "@/components/turnstile";

const STORAGE_KEY = "deke-notification-dismissed";
const SUPPRESSED_ROUTES = ["/services", "/find-group"];

interface FormState {
  firstName: string;
  email: string;
  location: string;
  newsletter: boolean;
  isGroup: boolean;
  groupName: string;
}

const initialFormState: FormState = {
  firstName: "",
  email: "",
  location: "",
  newsletter: false,
  isGroup: false,
  groupName: "",
};

export function NotificationPopup() {
  const pathname = usePathname();
  const isSuppressed = SUPPRESSED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const honeypotRef = useRef<HTMLInputElement>(null);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "duplicate" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isSuppressed) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage unavailable (SSR, private browsing)
      return;
    }

    const timer = setTimeout(() => setOpen(true), 3000);
    return () => clearTimeout(timer);
  }, [isSuppressed]);

  const handleDismiss = (isOpen: boolean) => {
    if (!isOpen) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
      setOpen(false);
    }
  };

  const handleInputChange = (field: keyof FormState, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (submitStatus === "error") {
      setSubmitStatus("idle");
      setErrorMessage("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");
    setErrorMessage("");

    try {
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          email: formData.email,
          location: formData.location,
          groupName: formData.isGroup ? formData.groupName : undefined,
          newsletterOptIn: formData.newsletter,
          website: honeypotRef.current?.value ?? "",
          turnstileToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Something went wrong. Please try again."
        );
      }

      setSubmitStatus(data.duplicate ? "duplicate" : "success");
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }

      // Auto-close after showing success
      setTimeout(() => setOpen(false), 2500);
    } catch (error) {
      setSubmitStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuppressed) return null;

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-md">
        {submitStatus === "success" || submitStatus === "duplicate" ? (
          <div className="text-center py-6" role="status" aria-live="polite">
            <CheckCircle
              className="h-14 w-14 text-green-500 mx-auto mb-3"
              aria-hidden="true"
            />
            <h3 className="text-lg font-semibold mb-1">
              {submitStatus === "duplicate"
                ? "You\u2019re already on the list!"
                : "You\u2019re on the list!"}
            </h3>
            <p className="text-muted-foreground text-sm">
              {submitStatus === "duplicate"
                ? "We already have you — no need to sign up again."
                : "We\u2019ll let you know when Deke is heading to your area."}
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
                  <Bell className="h-4 w-4 text-accent" aria-hidden="true" />
                </div>
                <DialogTitle className="font-heading text-lg">
                  Stay Informed
                </DialogTitle>
              </div>
              <DialogDescription>
                Get notified when Deke is visiting your area for workshops,
                coaching, or events.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Honeypot — invisible to humans, bots auto-fill it */}
              <div style={{ display: "none" }} aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  ref={honeypotRef}
                />
              </div>

              {submitStatus === "error" && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
                >
                  <AlertCircle
                    className="h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notify-firstName">First Name *</Label>
                <Input
                  id="notify-firstName"
                  placeholder="Your first name"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notify-email">Email *</Label>
                <Input
                  id="notify-email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notify-location">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    Your Location *
                  </span>
                </Label>
                <Input
                  id="notify-location"
                  placeholder="City, state, or region"
                  required
                  value={formData.location}
                  onChange={(e) =>
                    handleInputChange("location", e.target.value)
                  }
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="notify-newsletter"
                    checked={formData.newsletter}
                    onCheckedChange={(checked) =>
                      handleInputChange("newsletter", checked === true)
                    }
                    disabled={isSubmitting}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="notify-newsletter"
                    className="text-sm font-normal leading-snug cursor-pointer"
                  >
                    Please also include me in Deke&apos;s general newsletter
                  </Label>
                </div>

                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="notify-group"
                    checked={formData.isGroup}
                    onCheckedChange={(checked) =>
                      handleInputChange("isGroup", checked === true)
                    }
                    disabled={isSubmitting}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="notify-group"
                    className="text-sm font-normal leading-snug cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Users
                        className="h-3.5 w-3.5 flex-shrink-0"
                        aria-hidden="true"
                      />
                      I&apos;m part of a group — keep us informed about group
                      activities with Deke
                    </span>
                  </Label>
                </div>

                {formData.isGroup && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="notify-groupName">Group Name</Label>
                    <Input
                      id="notify-groupName"
                      placeholder="Your group or ensemble name"
                      value={formData.groupName}
                      onChange={(e) =>
                        handleInputChange("groupName", e.target.value)
                      }
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>

              <TurnstileWidget
                onVerify={setTurnstileToken}
                className="mt-1"
              />

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-10"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Signing up...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" aria-hidden="true" />
                    Notify Me
                  </>
                )}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
