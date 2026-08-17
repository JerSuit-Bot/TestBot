'use client';

import { Boxes, Info } from 'lucide-react';

export default function LogsPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#11221a]">Logs</h2>
        <p className="mt-2 text-sm text-[#708278]">Bot process logs and system event history.</p>
      </div>

      <div className="rounded-2xl border border-dashed border-[#cddbd0] bg-[#fbfdfb] p-12 text-center">
        <Boxes size={40} className="mx-auto text-[#c5d7c9]" />
        <p className="mt-4 text-sm text-[#8b9a91]">Bot process logs will appear here when the bot runtime is connected and running.</p>
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#cce4d1] bg-[#eaf7ed] p-4 text-left">
          <Info size={18} className="mt-0.5 shrink-0 text-[#199155]" />
          <p className="text-xs text-[#5f7c68]">Logs are written by the bot process to the bot_status table and are available when the bot is online. The bot process must be started from the Runtime page.</p>
        </div>
      </div>
    </>
  );
}
