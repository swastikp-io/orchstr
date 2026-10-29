import React, { useState } from 'react';
import { Company } from '../../types';
import { Building2, ChevronDown, Plus, RotateCw, Terminal, Copy, Check } from 'lucide-react';
import { api } from '../../api';

interface NavbarProps {
  companies: Company[];
  activeCompany: Company | null;
  onSelectCompany: (company: Company) => void;
  onOpenCreateModal: () => void;
  onReseed: () => void;
  isReseeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  companies,
  activeCompany,
  onSelectCompany,
  onOpenCreateModal,
  onReseed,
  isReseeding
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [isFetchingPrompt, setIsFetchingPrompt] = useState(false);

  const handleCopySetupPrompt = async () => {
    try {
      setIsFetchingPrompt(true);
      const data = await api.getSetupPrompt();
      await navigator.clipboard.writeText(data.fullCopyText);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 3000);
    } catch (err: any) {
      console.error('Failed to copy setup prompt:', err);
    } finally {
      setIsFetchingPrompt(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Workspace Switcher */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm tracking-tighter">
              Ω
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-1.5">
                <span className="font-mono font-bold tracking-wider text-base text-zinc-100">ORCHSTR</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest -mt-0.5">Company OS</span>
            </div>
          </div>

          <div className="h-6 w-px bg-zinc-800" />

          {/* Workspace Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm font-medium hover:border-zinc-700 transition-colors"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-200 max-w-[180px] truncate">
                {activeCompany ? activeCompany.name : 'Select Company'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180 text-zinc-300' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute left-0 mt-1 w-64 rounded-xl bg-zinc-900/95 border border-zinc-800 shadow-2xl py-1.5 backdrop-blur-md z-50">
                <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                  Workspaces
                </div>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectCompany(c);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-800/80 transition-colors ${
                      activeCompany?.id === c.id ? 'text-emerald-400 font-semibold bg-emerald-500/5' : 'text-zinc-300'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500 ml-2">{c.industry.split(' ')[0]}</span>
                  </button>
                ))}
                <div className="border-t border-zinc-800/60 my-1"></div>
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenCreateModal();
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center space-x-2 font-mono font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace...</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Runtime & Utility Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopySetupPrompt}
            disabled={isFetchingPrompt}
            title="Copy Claude Desktop, Cursor & Claude Code setup prompt with detected local paths"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-emerald-500/30 text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors shadow-sm"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Copy Setup Prompt</span>
              </>
            )}
          </button>

          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <Terminal className="w-3 h-3 text-emerald-400" />
            <span>Adapter: Claude Desktop / MCP</span>
          </div>

          <button
            onClick={onReseed}
            disabled={isReseeding}
            title="Reset database to canonical seed data"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-zinc-100 transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden md:inline">Reset Seed</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-mono font-semibold transition-all shadow-sm shadow-emerald-950/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Company</span>
          </button>
        </div>
      </div>
    </header>
  );
};
