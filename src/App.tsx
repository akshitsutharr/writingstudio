import React, { useState, useRef, useEffect } from 'react';
import { Plus, Palette, Type, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Trash2, StickyNote, Image, Link, Upload, X } from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'image' | 'link';
  url: string;
  title?: string;
  favicon?: string;
  position: number;
}

interface Board {
  id: string;
  title: string;
  content: string;
  color: string;
  media: MediaItem[];
}

interface TextStyle {
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  isBold: boolean;
  isItalic: boolean;
  isUnderlined: boolean;
  textColor: string;
}

// Storage keys
const STORAGE_KEYS = {
  BOARDS: 'writing-studio-boards',
  ACTIVE_BOARD: 'writing-studio-active-board',
  TEXT_STYLE: 'writing-studio-text-style'
};

// Default data
const DEFAULT_BOARDS: Board[] = [
  {
    id: '1',
    title: 'Welcome Board',
    content: '',
    color: 'bg-gradient-to-br from-purple-100 to-pink-100',
    media: []
  }
];

const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 24,
  fontFamily: 'Inter',
  textAlign: 'left',
  isBold: false,
  isItalic: false,
  isUnderlined: false,
  textColor: '#1f2937'
};

// Storage utilities with better error handling
const saveToStorage = (key: string, data: any) => {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    // Also save to sessionStorage as backup
    sessionStorage.setItem(key, serialized);
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
    // Try sessionStorage as fallback
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (sessionError) {
      console.warn('Failed to save to sessionStorage:', sessionError);
    }
  }
};

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    // Try localStorage first
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed;
    }
    
    // Fallback to sessionStorage
    const sessionStored = sessionStorage.getItem(key);
    if (sessionStored) {
      const parsed = JSON.parse(sessionStored);
      // Restore to localStorage
      localStorage.setItem(key, sessionStored);
      return parsed;
    }
  } catch (error) {
    console.warn('Failed to load from storage:', error);
  }
  return defaultValue;
};

function App() {
  // Initialize state from localStorage with better persistence
  const [boards, setBoards] = useState<Board[]>(() => 
    loadFromStorage(STORAGE_KEYS.BOARDS, DEFAULT_BOARDS)
  );
  
  const [activeBoard, setActiveBoard] = useState<string>(() => 
    loadFromStorage(STORAGE_KEYS.ACTIVE_BOARD, '1')
  );
  
  const [textStyle, setTextStyle] = useState<TextStyle>(() => 
    loadFromStorage(STORAGE_KEYS.TEXT_STYLE, DEFAULT_TEXT_STYLE)
  );
  
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    'bg-gradient-to-br from-purple-100 to-pink-100',
    'bg-gradient-to-br from-blue-100 to-cyan-100',
    'bg-gradient-to-br from-green-100 to-emerald-100',
    'bg-gradient-to-br from-yellow-100 to-orange-100',
    'bg-gradient-to-br from-rose-100 to-red-100',
    'bg-gradient-to-br from-indigo-100 to-purple-100'
  ];

  const fonts = [
    'Inter',
    'Georgia',
    'Times New Roman',
    'Arial',
    'Helvetica',
    'Courier New'
  ];

  const textColors = [
    '#1f2937', '#7c3aed', '#2563eb', '#059669', 
    '#dc2626', '#ea580c', '#be185d', '#4338ca'
  ];

  // Enhanced auto-save with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToStorage(STORAGE_KEYS.BOARDS, boards);
    }, 500); // Debounce saves by 500ms

    return () => clearTimeout(timeoutId);
  }, [boards]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ACTIVE_BOARD, activeBoard);
  }, [activeBoard]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToStorage(STORAGE_KEYS.TEXT_STYLE, textStyle);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [textStyle]);

  // Validate active board exists
  useEffect(() => {
    if (!boards.find(board => board.id === activeBoard)) {
      setActiveBoard(boards[0]?.id || '1');
    }
  }, [boards, activeBoard]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeBoard]);

  // Handle paste events for images and links
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Handle image paste
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const imageUrl = event.target?.result as string;
              addMediaToBoard('image', imageUrl);
            };
            reader.readAsDataURL(file);
          }
        }
        
        // Handle text paste (for URLs)
        if (item.type === 'text/plain') {
          item.getAsString((text) => {
            if (isValidUrl(text)) {
              addMediaToBoard('link', text);
            }
          });
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [activeBoard]);

  // Enhanced auto-save on page unload and visibility change
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveToStorage(STORAGE_KEYS.BOARDS, boards);
      saveToStorage(STORAGE_KEYS.ACTIVE_BOARD, activeBoard);
      saveToStorage(STORAGE_KEYS.TEXT_STYLE, textStyle);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Save when tab becomes hidden
        handleBeforeUnload();
      }
    };

    // Save on various events to ensure data persistence
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Auto-save every 30 seconds as additional backup
    const autoSaveInterval = setInterval(handleBeforeUnload, 30000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(autoSaveInterval);
    };
  }, [boards, activeBoard, textStyle]);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const addMediaToBoard = async (type: 'image' | 'link', url: string) => {
    const newMedia: MediaItem = {
      id: Date.now().toString(),
      type,
      url,
      position: Date.now()
    };

    // For links, try to get favicon and title
    if (type === 'link') {
      try {
        const domain = new URL(url).hostname;
        newMedia.favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        newMedia.title = domain;
      } catch (e) {
        newMedia.title = url;
      }
    }

    setBoards(boards.map(board => 
      board.id === activeBoard 
        ? { ...board, media: [...board.media, newMedia] }
        : board
    ));
  };

  const removeMediaFromBoard = (mediaId: string) => {
    setBoards(boards.map(board => 
      board.id === activeBoard 
        ? { ...board, media: board.media.filter(m => m.id !== mediaId) }
        : board
    ));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string;
          addMediaToBoard('image', imageUrl);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imageUrl = event.target?.result as string;
          addMediaToBoard('image', imageUrl);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleUrlSubmit = () => {
    if (imageUrl.trim()) {
      if (imageUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
        addMediaToBoard('image', imageUrl);
      } else if (isValidUrl(imageUrl)) {
        addMediaToBoard('link', imageUrl);
      }
      setImageUrl('');
      setShowImageUpload(false);
    }
  };

  const createNewBoard = () => {
    const newBoard: Board = {
      id: Date.now().toString(),
      title: `Board ${boards.length + 1}`,
      content: 'Start writing...',
      color: colors[Math.floor(Math.random() * colors.length)],
      media: []
    };
    
    setBoards([...boards, newBoard]);
    setActiveBoard(newBoard.id);
  };

  const deleteBoard = (boardId: string) => {
    if (boards.length === 1) return;
    
    const updatedBoards = boards.filter(board => board.id !== boardId);
    setBoards(updatedBoards);
    
    if (activeBoard === boardId) {
      setActiveBoard(updatedBoards[0].id);
    }
  };

  const updateBoardContent = (content: string) => {
    setBoards(boards.map(board => 
      board.id === activeBoard 
        ? { ...board, content }
        : board
    ));
  };

  const updateBoardColor = (color: string) => {
    setBoards(boards.map(board => 
      board.id === activeBoard 
        ? { ...board, color }
        : board
    ));
  };

  const currentBoard = boards.find(board => board.id === activeBoard);

  const getTextStyleClasses = () => {
    let classes = `text-${textStyle.fontSize === 16 ? 'base' : textStyle.fontSize === 20 ? 'xl' : textStyle.fontSize === 24 ? '2xl' : textStyle.fontSize === 28 ? '3xl' : '4xl'}`;
    
    if (textStyle.isBold) classes += ' font-bold';
    if (textStyle.isItalic) classes += ' italic';
    if (textStyle.isUnderlined) classes += ' underline';
    if (textStyle.textAlign === 'center') classes += ' text-center';
    if (textStyle.textAlign === 'right') classes += ' text-right';
    
    return classes;
  };

  // Logo Component
  const Logo = () => (
    <div className="flex items-center gap-3 mb-2">
      <div className="relative">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <div className="w-4 h-4 bg-white rounded-sm opacity-90"></div>
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full shadow-sm"></div>
      </div>
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          Writing Studio
        </h1>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Left Sidebar */}
      <div className="w-80 bg-white shadow-xl border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <Logo />
          <p className="text-slate-600 text-sm">Create beautiful notes and boards</p>
        </div>

        {/* Sticky Notes */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              Your Boards ({boards.length})
            </span>
            <button
              onClick={createNewBoard}
              className="p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {boards.map((board) => (
              <div
                key={board.id}
                className={`relative group cursor-pointer rounded-lg p-3 border-2 transition-all ${
                  activeBoard === board.id 
                    ? 'border-blue-500 shadow-md' 
                    : 'border-transparent hover:border-slate-300'
                } ${board.color}`}
                onClick={() => setActiveBoard(board.id)}
              >
                <div className="text-xs font-medium text-slate-700 truncate mb-1">
                  {board.title}
                </div>
                <div className="text-[10px] text-slate-600 truncate">
                  {board.content.substring(0, 30)}...
                </div>
                {board.media.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Image className="w-3 h-3 text-slate-500" />
                    <span className="text-[9px] text-slate-500">{board.media.length}</span>
                  </div>
                )}
                
                {boards.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBoard(board.id);
                    }}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded bg-red-500 text-white hover:bg-red-600 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Media Upload Section */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Image className="w-4 h-4" />
              Add Media
            </span>
            <button
              onClick={() => setShowImageUpload(!showImageUpload)}
              className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {showImageUpload && (
            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 p-2 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  Upload
                </button>
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="p-2 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Customization Panel */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Customize
          </h3>

          {/* Board Colors */}
          <div className="mb-6">
            <label className="text-xs font-medium text-slate-600 mb-2 block">Board Color</label>
            <div className="grid grid-cols-3 gap-2">
              {colors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => updateBoardColor(color)}
                  className={`w-full h-8 rounded-lg border-2 transition-all ${
                    currentBoard?.color === color 
                      ? 'border-slate-400 scale-105' 
                      : 'border-slate-200 hover:border-slate-300'
                  } ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Font Family */}
          <div className="mb-6">
            <label className="text-xs font-medium text-slate-600 mb-2 block">Font Family</label>
            <select
              value={textStyle.fontFamily}
              onChange={(e) => setTextStyle({...textStyle, fontFamily: e.target.value})}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {fonts.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="mb-6">
            <label className="text-xs font-medium text-slate-600 mb-2 block">Font Size</label>
            <div className="flex gap-2">
              {[16, 20, 24, 28, 32].map(size => (
                <button
                  key={size}
                  onClick={() => setTextStyle({...textStyle, fontSize: size})}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    textStyle.fontSize === size
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          {/* Text Color */}
          <div className="mb-6">
            <label className="text-xs font-medium text-slate-600 mb-2 block">Text Color</label>
            <div className="grid grid-cols-4 gap-2">
              {textColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => setTextStyle({...textStyle, textColor: color})}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    textStyle.textColor === color 
                      ? 'border-slate-400 scale-110' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Text Formatting */}
          <div className="mb-6">
            <label className="text-xs font-medium text-slate-600 mb-2 block">Formatting</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTextStyle({...textStyle, isBold: !textStyle.isBold})}
                className={`p-2 rounded-lg transition-all ${
                  textStyle.isBold 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTextStyle({...textStyle, isItalic: !textStyle.isItalic})}
                className={`p-2 rounded-lg transition-all ${
                  textStyle.isItalic 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTextStyle({...textStyle, isUnderlined: !textStyle.isUnderlined})}
                className={`p-2 rounded-lg transition-all ${
                  textStyle.isUnderlined 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Underline className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setTextStyle({...textStyle, textAlign: 'left'})}
                className={`p-2 rounded-lg transition-all ${
                  textStyle.textAlign === 'left' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTextStyle({...textStyle, textAlign: 'center'})}
                className={`p-2 rounded-lg transition-all ${
                  textStyle.textAlign === 'center' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => setTextStyle({...textStyle, textAlign: 'right'})}
                className={`p-2 rounded-lg transition-all ${
                  textStyle.textAlign === 'right' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="p-4 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
          <div className="text-center">
            <p className="text-xs text-slate-500 font-medium">
              Made with <span className="text-red-500 animate-pulse">❤</span> by <span className="text-blue-600 font-semibold">Akshit</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Auto-saved • Never lose your work
            </p>
          </div>
        </div>
      </div>

      {/* Main Writing Area */}
      <div className="flex-1 flex flex-col">
        {/* Board Header */}
        <div className="bg-white border-b border-slate-200 p-4">
          <input
            type="text"
            value={currentBoard?.title || ''}
            onChange={(e) => {
              setBoards(boards.map(board => 
                board.id === activeBoard 
                  ? { ...board, title: e.target.value }
                  : board
              ));
            }}
            className="text-xl font-semibold text-slate-800 bg-transparent border-none outline-none w-full"
            placeholder="Board Title"
          />
        </div>

        {/* Writing Area */}
        <div 
          className={`flex-1 p-8 ${currentBoard?.color || 'bg-white'} ${isDragging ? 'ring-4 ring-blue-300 ring-opacity-50' : ''} flex flex-col`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="fixed inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center z-50 pointer-events-none">
              <div className="bg-white rounded-xl p-8 shadow-2xl border-2 border-dashed border-blue-400">
                <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <p className="text-lg font-semibold text-blue-600">Drop images here</p>
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={currentBoard?.content || ''}
            onChange={(e) => updateBoardContent(e.target.value)}
            placeholder="Start writing your thoughts... You can also paste images and links directly!"
            className={`w-full flex-1 resize-none bg-transparent border-none outline-none placeholder-slate-400 ${getTextStyleClasses()}`}
            style={{
              fontFamily: textStyle.fontFamily,
              fontSize: `${textStyle.fontSize}px`,
              color: textStyle.textColor,
              lineHeight: '1.6',
              minHeight: '200px'
            }}
          />

          {/* Media Gallery - Now in main writing area */}
          {currentBoard?.media && currentBoard.media.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-200 border-opacity-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentBoard.media.map((media) => (
                  <div key={media.id} className="relative group">
                    {media.type === 'image' ? (
                      <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                        <img
                          src={media.url}
                          alt="Uploaded content"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEyNSA3NUwxNzUgMTI1SDE3NVYxNzVIMjVWMTI1TDc1IDc1TDEwMCAxMDBaIiBmaWxsPSIjOUNBM0FGIi8+CjxjaXJjbGUgY3g9IjE0MCIgY3k9IjYwIiByPSIxNSIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K';
                          }}
                        />
                        <button
                          onClick={() => removeMediaFromBoard(media.id)}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <a
                        href={media.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-6 bg-white bg-opacity-80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105 border border-slate-200 border-opacity-50"
                      >
                        <div className="flex items-center gap-4">
                          {media.favicon && (
                            <img
                              src={media.favicon}
                              alt="Site favicon"
                              className="w-10 h-10 rounded-xl shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 truncate text-lg">
                              {media.title || 'Link'}
                            </p>
                            <p className="text-sm text-slate-500 truncate">
                              {media.url}
                            </p>
                          </div>
                          <Link className="w-5 h-5 text-slate-400" />
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeMediaFromBoard(media.id);
                          }}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;