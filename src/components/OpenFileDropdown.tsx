import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Folder, FolderOpen, FolderArchive } from 'lucide-react';
import { AccentColor } from '../types';

interface OpenFileDropdownProps {
  onOpenFiles: (files: FileList | File[] | any[]) => void;
  onOpenFolder?: (files: File[] | any[]) => void;
  className?: string;
  placement?: 'auto' | 'up' | 'down';
  accent?: AccentColor;
}

export const OpenFileDropdown: React.FC<OpenFileDropdownProps> = ({
  onOpenFiles,
  onOpenFolder,
  className = '',
  placement = 'auto',
  accent = 'emerald',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [computedPlacement, setComputedPlacement] = useState<'up' | 'down'>('up');
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Compute direction whenever opened or resized
  useEffect(() => {
    if (isOpen && containerRef.current) {
      if (placement === 'up') {
        setComputedPlacement('up');
      } else if (placement === 'down') {
        setComputedPlacement('down');
      } else {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < 150) {
          setComputedPlacement('up');
        } else {
          setComputedPlacement('down');
        }
      }
    }
  }, [isOpen, placement]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpenFileClick = async () => {
    setIsOpen(false);

    if (window.electronAPI?.selectMusicFiles) {
      try {
        const filePaths = await window.electronAPI.selectMusicFiles();
        if (filePaths && filePaths.length > 0) {
          const resp = await fetch('/api/library/add-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePaths }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
              onOpenFiles(data.tracks);
              return;
            }
          }
        }
        return;
      } catch (err) {
        console.warn('Native file dialog fallback:', err);
      }
    }

    fileInputRef.current?.click();
  };

  const handleOpenFolderClick = async () => {
    setIsOpen(false);

    if (window.electronAPI?.selectMusicFolder) {
      try {
        const folderPath = await window.electronAPI.selectMusicFolder();
        if (folderPath) {
          const resp = await fetch('/api/library/add-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folderPath }),
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data.success && Array.isArray(data.tracks)) {
              if (onOpenFolder) {
                onOpenFolder(data.tracks);
              } else {
                onOpenFiles(data.tracks);
              }
              return;
            }
          }
        }
        return;
      } catch (err) {
        console.warn('Native folder dialog fallback:', err);
      }
    }

    // Try modern File System Access API if available
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'read',
        });
        const gatheredFiles: File[] = [];

        async function readDirectoryRecursively(handle: any) {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file: File = await entry.getFile();
              const ext = file.name.split('.').pop()?.toLowerCase();
              if (
                ['mp3', 'flac', 'wav', 'ogg', 'm4a', 'aac', 'webm', 'opus', 'mp4', 'mkv', 'mov', 'avi', 'm4v'].includes(
                  ext || ''
                )
              ) {
                gatheredFiles.push(file);
              }
            } else if (entry.kind === 'directory') {
              await readDirectoryRecursively(entry);
            }
          }
        }

        await readDirectoryRecursively(dirHandle);

        if (gatheredFiles.length > 0) {
          if (onOpenFolder) {
            onOpenFolder(gatheredFiles);
          } else {
            onOpenFiles(gatheredFiles);
          }
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
        console.warn('showDirectoryPicker fallback to input:', err);
      }
    }

    // Fallback: standard webkitdirectory folder input
    folderInputRef.current?.click();
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,video/*,.mp3,.flac,.wav,.ogg,.m4a,.aac,.webm,.opus,.mp4,.mkv,.mov,.avi,.m4v"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onOpenFiles(e.target.files);
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files).filter((f) => {
              const ext = f.name.split('.').pop()?.toLowerCase();
              return [
                'mp3',
                'flac',
                'wav',
                'ogg',
                'm4a',
                'aac',
                'webm',
                'opus',
                'mp4',
                'mkv',
                'mov',
                'avi',
                'm4v',
              ].includes(ext || '');
            });
            if (onOpenFolder) {
              onOpenFolder(filesArray);
            } else {
              onOpenFiles(filesArray);
            }
          }
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Button Styled in frosted glass / acrylic theme */}
      <div
        id="sidebar-open-file-btn"
        className={`group flex items-stretch rounded-xl bg-white/80 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-neutral-300/80 dark:border-white/10 transition-all text-neutral-900 dark:text-neutral-200 hover:text-black dark:hover:text-white shadow-xs backdrop-blur-md ${
          isOpen ? 'ring-1 ring-neutral-400 dark:ring-white/20 bg-white dark:bg-white/10' : ''
        }`}
      >
        {/* Main Action: Ouvrir un fichier */}
        <button
          type="button"
          onClick={handleOpenFileClick}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-neutral-900 dark:text-neutral-200 hover:text-black dark:hover:text-white transition-colors cursor-pointer select-none rounded-l-xl"
        >
          {/* Fluent/Screenbox Outline Folder Icon with User Accent */}
          <svg
            className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105"
            style={{ color: 'var(--primary)' }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
          </svg>
          <span className="whitespace-nowrap font-semibold">Ouvrir un fichier</span>
        </button>

        {/* Vertical divider */}
        <div className="w-px my-1.5 bg-neutral-300 dark:bg-white/10 transition-colors" />

        {/* Chevron Dropdown Toggle */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="px-2.5 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-r-xl transition-colors cursor-pointer select-none"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen
                ? computedPlacement === 'up'
                  ? 'rotate-0 text-neutral-900 dark:text-white'
                  : 'rotate-180 text-neutral-900 dark:text-white'
                : computedPlacement === 'up'
                ? 'rotate-180 text-neutral-500 dark:text-neutral-400'
                : 'rotate-0 text-neutral-500 dark:text-neutral-400'
            }`}
          />
        </button>
      </div>

      {/* Screenbox / Fluent Dropdown Menu matching mockup, seamlessly styled with glass */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 sm:right-auto sm:min-w-[240px] z-[100] glass-modal bg-white/95 dark:bg-neutral-900/90 border border-neutral-200 dark:border-white/10 shadow-2xl rounded-xl p-1.5 backdrop-blur-2xl ${
            computedPlacement === 'up'
              ? 'bottom-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-150'
              : 'top-full mt-2 animate-in fade-in slide-in-from-top-2 duration-150'
          }`}
          style={{
            boxShadow: '0 16px 36px -4px rgba(0, 0, 0, 0.25), 0 4px 16px -2px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Option 1: Ouvrir un fichier (Audio ou Vidéo) */}
          <button
            type="button"
            onClick={handleOpenFileClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-neutral-900 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left select-none group"
          >
            <svg
              className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110"
              style={{ color: 'var(--primary)' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
            </svg>
            <div className="flex flex-col">
              <span className="font-bold text-neutral-950 dark:text-neutral-100 text-xs">Ouvrir un fichier</span>
              <span className="text-[11px] text-neutral-700 dark:text-neutral-400 font-medium">Audio (MP3, FLAC...) ou Vidéo (MP4, MKV...)</span>
            </div>
          </button>

          {/* Option 2: Ouvrir un dossier */}
          <button
            type="button"
            onClick={handleOpenFolderClick}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium text-neutral-900 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors cursor-pointer text-left select-none group mt-0.5"
          >
            <svg
              className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110"
              style={{ color: 'var(--primary)' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 8 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
              <path d="M8 11h8" />
              <path d="M8 14h5" />
            </svg>
            <div className="flex flex-col">
              <span className="font-bold text-neutral-950 dark:text-neutral-100 text-xs">Ouvrir un dossier</span>
              <span className="text-[11px] text-neutral-700 dark:text-neutral-400 font-medium">Scanner et ajouter tout un répertoire</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
