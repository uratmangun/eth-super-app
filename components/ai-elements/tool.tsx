"use client";

import { ChevronDownIcon, Loader2Icon } from "lucide-react";
import type { Dispatch, HTMLAttributes, ReactNode, SetStateAction } from "react";
import { createContext, useContext, useState } from "react";

import { cn } from "@/lib/utils";

type ToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error"
  | "output-denied";

type ToolContextValue = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const ToolContext = createContext<ToolContextValue | null>(null);

function useToolContext() {
  const context = useContext(ToolContext);

  if (!context) {
    throw new Error("Tool components must be rendered inside <Tool>.");
  }

  return context;
}

export type ToolProps = HTMLAttributes<HTMLDivElement> & {
  defaultOpen?: boolean;
};

export const Tool = ({ children, className, defaultOpen = false, ...props }: ToolProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <ToolContext.Provider value={{ open, setOpen }}>
      <div
        className={cn(
          "group not-prose mb-4 w-full overflow-hidden rounded-md border bg-white/70",
          className,
        )}
        data-default-open={defaultOpen ? "true" : "false"}
        data-state={open ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    </ToolContext.Provider>
  );
};

export type ToolHeaderProps = {
  defaultOpen?: boolean;
  state: ToolState;
  title?: string;
  type: string;
};

export const ToolHeader = ({ defaultOpen = false, state, title, type }: ToolHeaderProps) => {
  const { open, setOpen } = useToolContext();
  const label =
    state === "input-streaming"
      ? "Running"
      : state === "input-available"
        ? "Running"
        : state === "output-available"
          ? "Completed"
          : state === "output-error"
            ? "Error"
            : "Denied";

  return (
    <button
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-4 p-3 text-left"
      data-slot="collapsible-trigger"
      onClick={() => setOpen((current) => !current)}
      type="button"
    >
      <div className="flex min-w-0 items-center gap-3">
        {state === "input-streaming" || state === "input-available" ? (
          <Loader2Icon className="size-4 animate-spin text-sky-600" />
        ) : null}
        <span className="truncate font-medium text-slate-950">{title ?? type.replace(/^tool-/, "")}</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            state === "output-available" && "bg-emerald-50 text-emerald-700",
            (state === "input-streaming" || state === "input-available") && "bg-sky-50 text-sky-700",
            state === "output-error" && "bg-rose-50 text-rose-700",
            state === "output-denied" && "bg-amber-50 text-amber-700",
          )}
        >
          {label}
        </span>
      </div>
      <ChevronDownIcon className={cn("size-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
    </button>
  );
};

export type ToolContentProps = {
  children: ReactNode;
};

export const ToolContent = ({ children }: ToolContentProps) => {
  const { open } = useToolContext();

  if (!open) {
    return null;
  }

  return <div className="border-t px-3 pb-3 pt-3">{children}</div>;
};

export type ToolInputProps = {
  input: unknown;
};

export const ToolInput = ({ input }: ToolInputProps) => (
  <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">{JSON.stringify(input, null, 2)}</pre>
);

export type ToolOutputProps = {
  errorText?: string;
  output?: ReactNode;
};

export const ToolOutput = ({ errorText, output }: ToolOutputProps) => {
  if (errorText) {
    return <div className="mt-3 rounded-md bg-rose-50 p-3 text-xs text-rose-700">{errorText}</div>;
  }

  return <div className="mt-3 rounded-md bg-sky-50 p-3 text-xs text-slate-700">{output}</div>;
};
