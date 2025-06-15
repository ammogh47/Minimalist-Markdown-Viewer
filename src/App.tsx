import  { useState, useCallback, useEffect } from 'react'; 
import { marked } from 'marked';
import { FileText, Upload, Plus, X, Home } from 'lucide-react';  

interface  Tab {
  id: string;
  title: string;
  content: string;
  isDragging: boolean;
}

function App() {
   const [tabs, setTabs] = useState<Tab[]>([{
    id: '1',
    title: 'New Tab',
    content: '',
    isDragging: false
  }]);
  const [activeTabId, setActiveTabId] = useState('1');
  const [nextTabId, setNextTabId] = useState(2);
  const [showHomeTab, setShowHomeTab] = useState(false); 

  // Handle scroll-based blur effect and home tab visibility
  useEffect(() => {
    const handleScroll = () => {
      const tabBar = document.getElementById('tab-bar');
      if (tabBar) {
        const scrollY = window.scrollY;
        const opacity = Math.max(0.7, 1 - scrollY / 200);
        tabBar.style.backgroundColor = `rgba(249, 250, 251, ${opacity})`;
        tabBar.style.backdropFilter = scrollY > 20 ? 'blur(8px)' : 'none';
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show home tab when multiple files with content exist
  useEffect(() => {
    const tabsWithContent = tabs.filter(tab => tab.content.trim());
    setShowHomeTab(tabsWithContent.length > 1);
  }, [tabs]); 

     const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const files = Array.from(e.dataTransfer.files);
    
    // Filter for markdown files
    const markdownFiles = files.filter(file => 
      file.type === 'text/markdown' || 
      file.name.endsWith('.md') || 
      file.name.endsWith('.markdown')
    );
    
    if (markdownFiles.length > 0) {
      handleMultipleFiles(markdownFiles);
    }
    
    // Reset dragging state
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, isDragging: false }
          : tab
      )
    );
  }, [activeTabId]); 

  const handleFolderDrop = async (directoryEntry: any) => {
    const markdownFiles: File[] = [];
    
    const readDirectory = (dirEntry: any): Promise<void> => {
      return new Promise((resolve) => {
        const dirReader = dirEntry.createReader();
        dirReader.readEntries(async (entries: any[]) => {
          for (const entry of entries) {
            if (entry.isFile && (entry.name.endsWith('.md') || entry.name.endsWith('.markdown'))) {
              const file: File = await new Promise((resolveFile) => {
                entry.file(resolveFile);
              });
              markdownFiles.push(file);
            } else if (entry.isDirectory) {
              await readDirectory(entry);
            }
          }
          resolve();
        });
      });
    };

    await readDirectory(directoryEntry);
    
    if (markdownFiles.length > 0) {
      handleMultipleFiles(markdownFiles);
    }
  };

  const handleMultipleFiles = async (files: File[]) => {
    // If current active tab is empty, replace it with first file
    const currentTab = tabs.find(tab => tab.id === activeTabId);
    const shouldReplaceCurrentTab = currentTab && !currentTab.content.trim();
    
    let newTabIdCounter = nextTabId;
    const newTabs: Tab[] = [];
    
    // Process all files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name.replace(/\.(md|markdown)$/i, '');
      
      try {
        const text = await readFileAsText(file);
        
        if (i === 0 && shouldReplaceCurrentTab) {
          // Replace current empty tab with first file
          setTabs(prevTabs => 
            prevTabs.map(tab => 
              tab.id === activeTabId 
                ? { ...tab, content: text, title: fileName, isDragging: false }
                : tab
            )
          );
        } else {
          // Create new tab for this file
          const newTab: Tab = {
            id: newTabIdCounter.toString(),
            title: fileName,
            content: text,
            isDragging: false
          };
          
          setTabs(prevTabs => [...prevTabs, newTab]);
          
          // Set first new tab as active if we're not replacing current tab
          if (i === 0 && !shouldReplaceCurrentTab) {
            setActiveTabId(newTabIdCounter.toString());
          }
          
          newTabIdCounter++;
        }
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
      }
    }
    
    setNextTabId(newTabIdCounter);
  };
  
  // Helper function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      reader.readAsText(file);
    });
  }; 

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, isDragging: true }
          : tab
      )
    );
  }, [activeTabId]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, isDragging: false }
          : tab
      )
    );
  }, [activeTabId]); 

   const addNewTab = () => {
    const newTab: Tab = {
      id: nextTabId.toString(),
      title: 'New Tab',
      content: '',
      isDragging: false
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTab.id);
    setNextTabId(prev => prev + 1);
  };

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return;
    
    setTabs(prevTabs => {
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      if (activeTabId === tabId && newTabs.length > 0) {
        const tabIndex = prevTabs.findIndex(tab => tab.id === tabId);
        const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0;
        setActiveTabId(newTabs[newActiveIndex].id);
      }
      return newTabs;
    });
  };

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  
  const getMarkdownHtml = (content: string) => {
    return marked(content);
  };

  const getMarkdownPreview = (content: string, maxLength: number = 200) => {
    const plainText = content.replace(/[#*`_~\[\]()]/g, '').substring(0, maxLength);
    return plainText + (content.length > maxLength ? '...' : '');
  };

  const openTab = (tabId: string) => {
    setActiveTabId(tabId);
  }; 

   return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Tab Bar */}
      <div id="tab-bar" className="sticky top-0 z-50 border-b border-gray-200/50 px-3 py-1.5 bg-gray-50 transition-all duration-200">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Home Tab - Only show when multiple files exist */}
          {showHomeTab && (
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-md cursor-pointer transition-all duration-200 flex-shrink-0 ${
                activeTabId === 'home' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTabId('home')}
              title="Home - View all files"
            >
              <Home className="w-3 h-3" />
            </div>
          )}
          
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center min-w-0 max-w-32 px-2 py-0.5 rounded-md cursor-pointer transition-all duration-200 ${
                tab.id === activeTabId 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="font-medium truncate mr-1 flex-1 text-xs">
                {tab.title}
              </span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className={`w-3 h-3 rounded-sm flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                    tab.id === activeTabId 
                      ? 'hover:bg-gray-700' 
                      : 'hover:bg-gray-300'
                  }`}
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          ))}
          
          {/* Add New Tab Button */}
          <button
            onClick={addNewTab}
            className="flex items-center justify-center w-5 h-5 rounded-sm bg-gray-100 hover:bg-gray-200 transition-all duration-200 flex-shrink-0"
            title="Add new tab"
          >
            <Plus className="w-2.5 h-2.5 text-gray-600" />
          </button>
        </div>
      </div> 

                {/* Content Area */}
      <div className="flex-1">
        {activeTabId === 'home' ? (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">All Documents</h1>
              <p className="text-gray-600">Click on any document to open it</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {tabs.filter(tab => tab.content.trim()).map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => openTab(tab.id)}
                  className="group cursor-pointer bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Document Preview - Mimics Google Docs thumbnail */}
                  <div className="h-48 p-4 bg-white border-b border-gray-100 relative overflow-hidden">
                    <div className="text-xs text-gray-700 leading-relaxed">
                      <div className="space-y-2">
                        {getMarkdownPreview(tab.content, 150).split('\n').slice(0, 8).map((line, index) => (
                          <div
                            key={index}
                            className={`h-2 bg-gray-200 rounded ${
                              line.length > 50 ? 'w-full' : 
                              line.length > 25 ? 'w-3/4' : 
                              line.length > 10 ? 'w-1/2' : 'w-1/4'
                            }`}
                            style={{
                              width: line.trim() ? `${Math.min(100, (line.length / 60) * 100)}%` : '25%'
                            }}
                          />
                        ))}
                      </div>
                      {/* Fade overlay at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                    </div>
                  </div>
                  
                  {/* Document Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 text-sm truncate mb-1 group-hover:text-blue-600 transition-colors">
                      {tab.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {getMarkdownPreview(tab.content, 60)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !activeTab?.content ? ( 
          <div
                       className={`h-[calc(100vh-44px)] flex flex-col items-center justify-center transition-colors duration-200 ${ 
              activeTab?.isDragging ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-300'
            } border-2 border-dashed m-6 rounded-xl`} 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="text-center">
              <div className="mb-6">
                {activeTab?.isDragging ? (
                  <Upload className="mx-auto h-16 w-16 text-blue-500" />
                ) : (
                  <img 
                    src="https://imagedelivery.net/FIZL8110j4px64kO6qJxWA/327bdb3e-d22d-4ccc-91b9-15a309559800/public" 
                    alt="Markdown" 
                    className="mx-auto h-16 w-16 opacity-60"
                  />
                )}
              </div>
                           <p className="text-2xl font-medium text-gray-700 mb-3">
                {activeTab?.isDragging ? 'Drop your markdown files here' : 'Drop multiple markdown files'}
              </p>
              <p className="text-base text-gray-500 mb-2">
                Select multiple .md files and drop them here
              </p>
              <p className="text-sm text-gray-400">
                Each markdown file will open in its own tab
              </p> 
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-8 py-12 bg-white min-h-[calc(100vh-44px)]"> 
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: getMarkdownHtml(activeTab.content) }}
            />
          </div>
        )} 
      </div>
    </div>
  ); 
}

export default App;
 