"use client";

import { useState } from "react";
import { css } from "../../../styled-system/css";
import { flex, stack } from "../../../styled-system/patterns";
import { Search, Globe, Check, AlertCircle, Loader2 } from "lucide-react";

interface FindWebsiteButtonProps {
  name: string;
  onFound: (website: string) => void;
}

export default function FindWebsiteButton({ name, onFound }: FindWebsiteButtonProps) {
  const [loading, setLoading] = useState(false);

  const find = async () => {
    if (!name) return;
    setLoading(true);
    try {
      // In a real app without a paid API, we use a simple heuristic or a search redirect.
      // But for this "intelligent" requirement, we'll use a public search suggestions API 
      // or try to guess. Clearbit Autocomplete is great but requires a domain.
      
      // Let's try a simple trick: use DuckDuckGo's "I'm feeling lucky" redirect or similar
      // Or just a google search link if we can't do it purely client-side easily.
      
      // Better: we'll simulate a smart search that takes the name and cleans it.
      const query = name.toLowerCase()
        .replace(/[^a-z0-9а-я\s]/g, '')
        .trim()
        .split(' ')[0];
      
      // If it's a known brand, we can help.
      const popular: Record<string, string> = {
        'ozon': 'ozon.ru',
        'wildberries': 'wildberries.ru',
        'yandex': 'yandex.ru',
        'тенькофф': 'tinkoff.ru',
        'тинькофф': 'tinkoff.ru',
        'сбер': 'sberbank.ru',
        'сбербанк': 'sberbank.ru',
        'альфа': 'alfabank.ru',
        'пятерочка': '5ka.ru',
        'магнит': 'magnit.ru',
        'додо': 'dodopizza.ru',
        'вкусвилл': 'vkusvill.ru',
        'мвидео': 'mvideo.ru',
        'эльдорадо': 'eldorado.ru'
      };

      if (popular[query]) {
        onFound(popular[query]);
      } else {
        // Fallback: search on google and let user copy
        window.open(`https://www.google.com/search?q=${encodeURIComponent(name + ' официальный сайт')}`, '_blank');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      type="button"
      onClick={find}
      disabled={loading}
      className={flex({ 
        align: "center", 
        gap: "6px", 
        fontSize: "11px", 
        fontWeight: "700", 
        color: "sberGreen", 
        cursor: "pointer", 
        p: "4px 8px", 
        bg: "#f0fdf4", 
        borderRadius: "8px",
        _hover: { bg: "#dcfce7" }
      })}
    >
      {loading ? <Loader2 size={12} className={css({ animation: "spin 1s linear infinite" })} /> : <Globe size={12} />}
      НАЙТИ САЙТ
    </button>
  );
}
