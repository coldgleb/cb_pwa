"use client";

import { Globe, Loader2 } from "lucide-react";
import { useState } from "react";
import { css } from "../../../styled-system/css";
import { flex } from "../../../styled-system/patterns";

export default function FindWebsiteButtonWrapper({ 
  targetInputId, 
  nameInputId 
}: { 
  targetInputId: string, 
  nameInputId: string 
}) {
  const [loading, setLoading] = useState(false);

  const find = () => {
    const nameInput = document.getElementById(nameInputId) as HTMLInputElement;
    const targetInput = document.getElementById(targetInputId) as HTMLInputElement;
    const name = nameInput?.value;
    
    if (!name) return;
    setLoading(true);
    
    const query = name.toLowerCase()
      .replace(/[^a-z0-9а-я\s]/g, '')
      .trim()
      .split(' ')[0];
    
    const popular: Record<string, string> = {
      'ozon': 'ozon.ru',
      'wildberries': 'wildberries.ru',
      'yandex': 'yandex.ru',
      'tinkoff': 'tinkoff.ru',
      'тинькофф': 'tinkoff.ru',
      'сбер': 'sberbank.ru',
      'альфа': 'alfabank.ru',
      'пятерочка': '5ka.ru',
      'магнит': 'magnit.ru',
      'додо': 'dodopizza.ru',
      'вкусвилл': 'vkusvill.ru'
    };

    if (popular[query]) {
      if (targetInput) targetInput.value = popular[query];
    } else {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(name + ' официальный сайт')}`, '_blank');
    }
    setLoading(false);
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
