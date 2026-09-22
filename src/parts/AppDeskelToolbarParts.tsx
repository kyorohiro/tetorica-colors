import { ReactNode } from "react";
import { useAppState } from "../state";

const modeButtonBase =
  "flex items-center gap-2 rounded-2xl border px-2 py-2 m-0.5 text-xs transition-colors outline-none";

function modeButtonClass(active: boolean) {
  return `${modeButtonBase} ${
    active
      ? "border-emerald-500 bg-emerald-950 text-emerald-300"
      : "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 active:bg-slate-700"
  }`;
}

function ModeButton(props: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      className={`${modeButtonClass(props.active)} ${props.className ?? ""}`}
      onClick={props.onClick}
      title={props.title}
      aria-label={props.title}
    >
      {props.children}
    </button>
  );
}

function SubToolbar(props: {
  open: boolean;
  onToggle: () => void;
  hidden: boolean;
  children: ReactNode;
}) {
  const { clickThrough } = useAppState();
  const hidden = props.hidden || clickThrough;
  return (
    <div
      className={`fixed bottom-4 right-4 z-9999 items-end gap-2 ${
        hidden ? "hidden" : "flex"
      } ${
        hidden ? "pointer-events-none" : "pointer-events-auto" }
      }`}
    >
      <button
        className="rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-3 text-xs text-slate-100 shadow-xl transition-colors hover:bg-slate-800"
        onClick={props.onToggle}
      >
        {props.open ? ">" : "<"}
      </button>

      <div
        className={`overflow-hidden rounded-2xl bg-slate-950/80 shadow-xl backdrop-blur transition-all duration-200 ${
          props.open
            ? "max-w-[1200px] opacity-100 translate-x-0 border border-slate-800"
            : "max-w-0 opacity-0 translate-x-2 border border-transparent"
        }`}
      >
        <div className="flex flex-col gap-1 p-1 sm:flex-row sm:flex-wrap">
          {props.children}
        </div>
      </div>
    </div>
  );
}

//
const toolbarButtonBase =
  "flex items-center gap-2 rounded-2xl border px-2 py-2 m-0.5 text-xs transition-colors outline-none";

function toolbarButtonClass(active = false) {
  return `${toolbarButtonBase} ${active
    ? "border-emerald-500 bg-emerald-950 text-emerald-300"
    : "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 active:bg-slate-700"
    }`;
}
export { ModeButton, SubToolbar, toolbarButtonClass };