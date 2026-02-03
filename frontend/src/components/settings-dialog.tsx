"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SettingsUser = {
  name: string;
  email: string;
  accountType: string;
  avatar: string | null;
};

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SettingsUser | null;
  displayName: string;
  onUserUpdated?: (user: SettingsUser) => void;
};

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_API ?? "http://localhost:4000";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const AUDIO_INPUT_STORAGE_KEY = "fv-settings-audio-input";

const settingsSchema = z.object({
  name: z.string().min(1, "Name is required"),
  reminders: z.boolean(),
  summaries: z.boolean(),
  audioInput: z.string().optional(),
  avatar: z
    .union([z.instanceof(File), z.null(), z.undefined()])
    .refine((file) => !file || file.size <= MAX_AVATAR_SIZE, {
      message: "Avatar must be 5MB or smaller",
    }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

export function SettingsDialog({
  open,
  onOpenChange,
  user,
  displayName,
  onUserUpdated,
}: SettingsDialogProps) {
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(
    user?.avatar ?? null,
  );
  const [avatarFileName, setAvatarFileName] = React.useState<string | null>(
    null,
  );
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);
  const avatarUrlRef = React.useRef<string | null>(null);

  const [audioInputs, setAudioInputs] = React.useState<
    { value: string; deviceId: string; label: string }[]
  >([]);
  const [audioError, setAudioError] = React.useState<string | null>(null);
  const [audioLoading, setAudioLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: displayName,
      reminders: true,
      summaries: true,
      audioInput: "",
      avatar: null,
    },
  });

  const initials = React.useMemo(() => {
    const source = displayName || user?.name || "";
    const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "FV";
    const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
    return letters.join("");
  }, [displayName, user?.name]);

  const refreshAudioInputs = React.useCallback(
    async (requestPermission: boolean) => {
      if (!navigator?.mediaDevices?.enumerateDevices) {
        setAudioError(
          "Audio device selection is not supported in this browser.",
        );
        setAudioInputs([]);
        return;
      }

      setAudioLoading(true);
      setAudioError(null);

      try {
        if (requestPermission && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices
          .filter((device) => device.kind === "audioinput")
          .map((device, index) => {
            const safeValue = device.deviceId || `unknown-${index + 1}`;
            return {
              value: safeValue,
              deviceId: device.deviceId || safeValue,
              label: device.label || `Audio input ${index + 1}`,
            };
          });

        setAudioInputs(inputs);
        const storedValue =
          typeof window !== "undefined"
            ? window.localStorage.getItem(AUDIO_INPUT_STORAGE_KEY) ?? ""
            : "";
        const currentValue = getValues("audioInput") ?? "";
        const preferredValue = storedValue || currentValue;
        const nextValue =
          inputs.length === 0
            ? ""
            : inputs.some((device) => device.value === preferredValue)
              ? preferredValue
              : inputs[0].value;

        setValue("audioInput", nextValue, { shouldDirty: false });
        if (nextValue && typeof window !== "undefined") {
          window.localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, nextValue);
        }
      } catch (error) {
        setAudioError(
          "We couldn't access your audio devices. Allow microphone access and try again.",
        );
      } finally {
        setAudioLoading(false);
      }
    },
    [getValues, setValue],
  );

  React.useEffect(() => {
    if (!open) return;
    const storedAudioInput =
      typeof window !== "undefined"
        ? window.localStorage.getItem(AUDIO_INPUT_STORAGE_KEY) ?? ""
        : "";
    setSubmitError(null);
    reset({
      name: displayName,
      reminders: true,
      summaries: true,
      audioInput: storedAudioInput,
      avatar: null,
    });
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
    void refreshAudioInputs(false);
  }, [open, displayName, refreshAudioInputs, reset]);

  React.useEffect(() => {
    return () => {
      if (avatarUrlRef.current) {
        URL.revokeObjectURL(avatarUrlRef.current);
        avatarUrlRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current);
      avatarUrlRef.current = null;
    }
    setAvatarPreview(user?.avatar ?? null);
    setAvatarFileName(null);
  }, [user?.avatar, open]);

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    setSubmitError(null);

    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    avatarUrlRef.current = objectUrl;
    setAvatarPreview(objectUrl);
    setAvatarFileName(file.name);
  };

  const handleAvatarClear = () => {
    setSubmitError(null);
    if (avatarUrlRef.current) {
      URL.revokeObjectURL(avatarUrlRef.current);
      avatarUrlRef.current = null;
    }

    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }

    setAvatarPreview(null);
    setAvatarFileName(null);
    setValue("avatar", null, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (values: SettingsFormValues) => {
    setSubmitError(null);
    try {
      const payload: { name: string; avatar?: string | null } = {
        name: values.name.trim(),
      };

      if (dirtyFields.avatar) {
        if (values.avatar === null) {
          payload.avatar = null;
        } else if (values.avatar instanceof File) {
          payload.avatar = await fileToDataUrl(values.avatar);
        }
      }

      const res = await fetch(`${API_BASE}/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message ?? "Unable to update profile";
        throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
      }

      const nextAvatar =
        data?.avatar ??
        (payload.avatar !== undefined ? payload.avatar : user?.avatar ?? null);
      onUserUpdated?.({
        name: data?.name ?? payload.name,
        email: data?.email ?? user?.email ?? "",
        accountType: data?.accountType ?? user?.accountType ?? "",
        avatar: nextAvatar,
      });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Unable to update profile");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="settings-dialog" className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account details and app preferences.
          </DialogDescription>
        </DialogHeader>
        <form className="grid gap-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-3">
            <div className="text-sm font-medium">Account</div>
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-[56px_minmax(0,1fr)] sm:items-start">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="Change profile photo"
                      className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Avatar className="group h-14 w-14 ring-1 ring-border/50">
                        <AvatarImage
                          src={avatarPreview ?? undefined}
                          alt={displayName}
                        />
                        <AvatarFallback>{initials}</AvatarFallback>
                        <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-[10px] font-medium uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Change
                        </span>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      onSelect={() => avatarInputRef.current?.click()}
                    >
                      Upload new photo
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={handleAvatarClear}
                      disabled={!avatarPreview && !avatarFileName}
                    >
                      Remove photo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="grid gap-1">
                  <Label
                    htmlFor="settings-name"
                    className="text-xs text-muted-foreground"
                  >
                    Name
                  </Label>
                  <Input
                    id="settings-name"
                    className="w-full"
                    {...register("name")}
                  />
                  {errors.name ? (
                    <p className="text-xs text-destructive">
                      {errors.name.message}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {avatarFileName ?? "Click avatar to change"}
                    </p>
                  )}
                  {errors.avatar && (
                    <p className="text-xs text-destructive">
                      {errors.avatar.message}
                    </p>
                  )}
                </div>
                <Controller
                  name="avatar"
                  control={control}
                  render={({ field }) => (
                    <input
                      ref={(node) => {
                        field.ref(node);
                        avatarInputRef.current = node;
                      }}
                      id="settings-avatar"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        field.onChange(file);
                        handleAvatarChange(file);
                      }}
                    />
                  )}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label
                    htmlFor="settings-email"
                    className="text-xs text-muted-foreground"
                  >
                    Email
                  </Label>
                  <Input
                    id="settings-email"
                    value={user?.email ?? ""}
                    placeholder="Not provided"
                    readOnly
                    className="w-full opacity-60"
                  />
                </div>
                <div className="grid gap-1">
                  <Label
                    htmlFor="settings-account"
                    className="text-xs text-muted-foreground"
                  >
                    Account type
                  </Label>
                  <Input
                    id="settings-account"
                    value={user?.accountType ?? "Personal"}
                    readOnly
                    className="w-full opacity-60"
                  />
                </div>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid gap-3">
            <div className="text-sm font-medium">Preferences</div>
            <div className="flex items-start gap-3">
              <Controller
                name="reminders"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="settings-reminders"
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(Boolean(value))}
                  />
                )}
              />
              <div className="grid gap-1">
                <Label htmlFor="settings-reminders">Practice reminders</Label>
                <p className="text-xs text-muted-foreground">
                  Get weekly nudges to stay on track.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Controller
                name="summaries"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="settings-summaries"
                    checked={field.value}
                    onCheckedChange={(value) => field.onChange(Boolean(value))}
                  />
                )}
              />
              <div className="grid gap-1">
                <Label htmlFor="settings-summaries">Progress summaries</Label>
                <p className="text-xs text-muted-foreground">
                  Receive a recap after each session.
                </p>
              </div>
            </div>
          </div>
          <Separator />
          <div className="grid gap-3">
            <div className="text-sm font-medium">Audio</div>
            <div className="grid gap-2">
              <Label htmlFor="settings-audio-input">Input device</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Controller
                  name="audioInput"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (typeof window !== "undefined") {
                          window.localStorage.setItem(
                            AUDIO_INPUT_STORAGE_KEY,
                            value,
                          );
                        }
                      }}
                      disabled={audioInputs.length === 0}
                    >
                      <SelectTrigger id="settings-audio-input" className="w-60">
                        <SelectValue
                          placeholder={
                            audioInputs.length === 0
                              ? "No input devices found"
                              : "Select input"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {audioInputs.map((device) => (
                          <SelectItem key={device.value} value={device.value}>
                            {device.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => refreshAudioInputs(true)}
                  disabled={audioLoading}
                >
                  {audioLoading ? "Scanning..." : "Detect devices"}
                </Button>
              </div>
              {audioError ? (
                <p className="text-xs text-destructive">{audioError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Choose the microphone or audio interface you want to use for
                  guitar capture.
                </p>
              )}
            </div>
          </div>
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
