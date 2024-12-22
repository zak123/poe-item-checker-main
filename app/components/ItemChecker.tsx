'use client';
import { useState, useEffect } from 'react';
import { fetchStats, findStatId, extractValue, StatOption } from '../utils/stats';
import { ITEM_CLASS_MAP } from '../constants/itemTypes';
import type { ParsedItem } from '../types/item';

interface ItemCheckerProps {
  league: string;
}

const RATE_LIMIT_DELAY = 1000;

export default function ItemChecker({ league }: ItemCheckerProps) {
  const [itemText, setItemText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatOption[]>([]);
  const [includeItemLevel, setIncludeItemLevel] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const fetchedStats = await fetchStats();
        setStats(fetchedStats);
      } catch (error) {
        setError('Failed to load item stats database');
        console.error('Failed to load stats:', error);
      }
    };
    loadStats();
  }, []);

  const parseItemText = (text: string): ParsedItem => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    let itemClass: string | undefined;
    let itemLevel: number | undefined;
    let stats: string[] = [];
    let rarity: string | undefined;
    let name: string | undefined;
    let baseType: string | undefined;
    let foundItemLevel = false;
    let foundStats = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('Item Class:')) {
        itemClass = line.replace('Item Class:', '').trim();
      } else if (line.startsWith('Item Level:')) {
        const match = line.match(/Item Level: (\d+)/);
        if (match) {
          itemLevel = parseInt(match[1]);
          foundItemLevel = true;
        }
      } else if (line.startsWith('Rarity:')) {
        rarity = line.replace('Rarity:', '').trim();
        if (rarity === 'Unique' && i + 2 < lines.length) {
          name = lines[i + 1].trim();
          baseType = lines[i + 2].trim();
        }
      } else if (foundItemLevel && !foundStats) {
        if (line.includes('--------')) {
          foundStats = true;
        }
      } else if (foundStats && !line.includes('--------')) {
        if (line.match(/[0-9]+/) ||
          line.includes('to ') ||
          line.includes('increased ') ||
          line.includes('reduced ') ||
          line.includes('Recover')) {
          stats.push(line);
        }
      }
    }

    return { itemClass, itemLevel, stats, rarity, name, baseType };
  };

  const handleSearch = async () => {
    if (!itemText.trim()) {
      setError('Please paste an item first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedItem = parseItemText(itemText);

      if (parsedItem.itemClass && !ITEM_CLASS_MAP[parsedItem.itemClass]) {
        setError(`Item type "${parsedItem.itemClass}" is not supported yet`);
        setLoading(false);
        return;
      }

      // Create base query structure
      const baseQuery = {
        query: {
          status: { option: "online" },
          stats: [{ type: "and", filters: [], disabled: false }]
        },
        sort: { price: "asc" }
      };

      // Build the query based on item type
      let query;
      if (parsedItem.rarity === 'Unique' && parsedItem.name && parsedItem.baseType) {
        query = {
          ...baseQuery,
          query: {
            ...baseQuery.query,
            name: parsedItem.name,
            type: parsedItem.baseType,
            filters: {
              type_filters: {
                filters: {
                  category: parsedItem.itemClass ? {
                    option: ITEM_CLASS_MAP[parsedItem.itemClass]
                  } : undefined,
                  ilvl: parsedItem.itemLevel && includeItemLevel ? {
                    min: parsedItem.itemLevel
                  } : undefined
                },
                disabled: false
              }
            }
          }
        };
      } else {
        const statFilters = parsedItem.stats
          .map(stat => {
            const statId = findStatId(stat, stats);
            if (!statId) {
              console.log('No stat ID found for:', stat);
              return null;
            }

            const value = extractValue(stat);
            console.log('Found stat:', { id: statId, value, originalStat: stat });

            return {
              id: statId,
              value: { min: value },
              disabled: false
            };
          })
          .filter((filter): filter is NonNullable<typeof filter> => filter !== null);

        if (statFilters.length === 0) {
          setError('No valid stats found to search for');
          setLoading(false);
          return;
        }

        query = {
          ...baseQuery,
          query: {
            ...baseQuery.query,
            stats: [{
              type: "and",
              filters: statFilters,
              disabled: false
            }],
            filters: {
              type_filters: {
                filters: {
                  category: parsedItem.itemClass ? {
                    option: ITEM_CLASS_MAP[parsedItem.itemClass]
                  } : undefined,
                  ilvl: parsedItem.itemLevel && includeItemLevel ? {
                    min: parsedItem.itemLevel
                  } : undefined
                },
                disabled: false
              }
            }
          }
        };
      }

      // Clean up undefined values
      if (!parsedItem.itemClass) {
        delete query.query.filters?.type_filters.filters.category;
      }
      if (!parsedItem.itemLevel || !includeItemLevel) {
        delete query.query.filters?.type_filters.filters.ilvl;
      }

      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

      const response = await fetch('/api/poe/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, league }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        throw new Error(errorData.error || 'Search failed');
      }

      const data = await response.json();

      if (data.id) {
        window.open(`https://www.pathofexile.com/trade2/search/${league}/${data.id}`, '_blank');
      } else {
        throw new Error('No search ID returned');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatItemText = (text: string) => {
    if (!text) return '';

    return text.split('\n').map((line, i) => {
      if (line.includes('--------')) {
        return `<div class="text-blue-400/50">--------</div>`;
      }
      if (line.startsWith('Item Class:')) {
        return `<div class="text-cyan-400">${line}</div>`;
      }
      if (line.startsWith('Item Level:')) {
        return `<div class="text-blue-400">${line}</div>`;
      }
      if (line.startsWith('Rarity:')) {
        return `<div class="text-yellow-400">${line}</div>`;
      }
      if (line.match(/[0-9]+/)) {
        return `<div class="text-cyan-300">${line}</div>`;
      }
      if (line.includes('Requires')) {
        return `<div class="text-gray-400">${line}</div>`;
      }
      if (i <= 2 && line.trim() && !line.includes(':')) {
        return `<div class="text-yellow-200 font-semibold">${line}</div>`;
      }
      return `<div class="text-white/90">${line}</div>`;
    }).join('');
  };

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.includes('Item Class:')) {
        const formatted = formatItemText(text);
        const editor = document.querySelector('[contenteditable]');
        if (editor) {
          editor.innerHTML = formatted;
          setItemText(text);
        }
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  useEffect(() => {
    handleClipboardPaste();

    const handleFocus = () => {
      handleClipboardPaste();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    if (itemText) {
      handleSearch();
    }
  }, [itemText]);

  return (
    <div>
      <div
        hidden
        contentEditable

        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData('text');
          const formatted = formatItemText(text);
          e.currentTarget.innerHTML = formatted;
          setItemText(text);
        }}
        onInput={(e) => {
          const text = e.currentTarget.innerText;
          setItemText(text);
        }}
        dangerouslySetInnerHTML={{ __html: itemText ? formatItemText(itemText) : '' }}
        spellCheck={false}
      />

      {error && (
        <div className="text-red-400 text-sm text-center bg-red-900/20 rounded-lg p-2 border border-red-500/20">
          {error}
        </div>
      )}
      <label htmlFor="includeItemLevel" className="text-sm select-none">
        Include item level in search
      </label>
      <button
        role="switch"
        id="includeItemLevel"
        aria-checked={includeItemLevel}
        onClick={() => setIncludeItemLevel(!includeItemLevel)}
        className={`
            relative inline-flex h-6 w-11 items-center rounded-full
            transition-colors duration-200 ease-in-out
            focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            ${includeItemLevel ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : 'bg-white/10'}
          `}
      >
        <span
          className={`
              ${includeItemLevel ? 'translate-x-6' : 'translate-x-1'}
              inline-block h-4 w-4 transform rounded-full
              bg-white transition duration-200 ease-in-out
            `}
        />
      </button>
      <div style={{ height: '50px' }} />

      {loading && <span>
        <svg className="animate-spin h-7 w-7" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </span>}


    </div>
  );
}
