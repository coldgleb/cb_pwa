"use client";

import { useState, useEffect, useMemo } from "react";
import { css } from "../../../styled-system/css";
import { stack, flex, grid } from "../../../styled-system/patterns";
import { Store, Edit2, Save, X } from "lucide-react";
import { getIconUrl } from "@/lib/utils/icons";
import ViewModeToggle, { HistoryViewMode } from "../ViewModeToggle";
import SearchableSelect from "@/components/SearchableSelect";
import DeleteMerchantButton from "./DeleteMerchantButton";
import AdminFormWrapper from "./AdminFormWrapper";
import { updateMerchant, getMerchantMccSuggestions } from "@/lib/actions/merchants";
import UniversalTable, { ColumnDef } from "../UniversalTable";
import { Search, Loader2 } from "lucide-react";

interface Merchant {
  id: number;
  name: string;
  mainMcc: string;
  additionalMccs: string;
  website: string | null;
  logo: string | null;
  spendingCategoryId: number | null;
}

interface AdminMerchantsListProps {
  merchants: Merchant[];
  mccOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
}

export default function AdminMerchantsList({
  merchants,
  mccOptions,
  categoryOptions,
}: AdminMerchantsListProps) {
  const [viewMode, setViewMode] = useState<HistoryViewMode>("cards");
  const [mounted, setMounted] = useState(false);
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [isSearching, setIsSearching] = useState<number | string | null>(null);
  
  // Track manual overrides for MCC fields to support auto-fill
  const [mccOverrides, setMccOverrides] = useState<Record<number, { mainMcc?: string, additionalMccs?: string }>>({});
  const [modalMccOverride, setModalMccOverride] = useState<{ mainMcc?: string, additionalMccs?: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("admin-merchants-view-mode") as HistoryViewMode;
    if (saved && (saved === "cards" || saved === "table")) {
      setViewMode(saved);
    }
    setMounted(true);
  }, []);

  const handleViewChange = (mode: HistoryViewMode) => {
    setViewMode(mode);
    localStorage.setItem("admin-merchants-view-mode", mode);
  };

  const handleAutoSearch = async (id: number | "new", name: string) => {
    setIsSearching(id);
    try {
      const result = await getMerchantMccSuggestions(name);
      if (result) {
        if (id === "new" || (editingMerchant && id === editingMerchant.id)) {
          setModalMccOverride({
            mainMcc: result.mainMcc,
            additionalMccs: result.additionalMccs
          });
        } else {
          setMccOverrides(prev => ({
            ...prev,
            [id as number]: {
              mainMcc: result.mainMcc,
              additionalMccs: result.additionalMccs
            }
          }));
        }
      }
    } finally {
      setIsSearching(null);
    }
  };

  const getCategoryLabel = (id: number | null) => {
    if (!id) return "—";
    const found = categoryOptions.find(opt => opt.value === id.toString());
    return found ? found.label : "—";
  };

  const columns = useMemo<ColumnDef<Merchant>[]>(() => [
    {
      id: "name",
      label: "МЕРЧАНТ",
      accessor: (merchant) => merchant.name,
      renderCell: (merchant) => {
        const icon = getIconUrl(merchant);
        return (
          <div className={flex({ align: "center", gap: "10px" })}>
            <div className={css({ w: "36px", h: "36px", bg: "#f8fafc", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f1f5f9", overflow: "hidden", flexShrink: 0 })}>
              {icon ? (
                <img src={icon} className={css({ w: "full", h: "full", objectFit: "contain", p: "2px" })} alt={merchant.name} />
              ) : (
                <Store size={14} color="#94a3b8" />
              )}
            </div>
            <span className={css({ fontWeight: "700", whiteSpace: "nowrap" })}>{merchant.name}</span>
          </div>
        );
      }
    },
    {
      id: "website",
      label: "САЙТ",
      accessor: (merchant) => merchant.website || "",
      renderCell: (merchant) => {
        return merchant.website ? (
          <a href={`https://${merchant.website}`} target="_blank" rel="noopener noreferrer" className={css({ color: "var(--sber-green)", textDecoration: "underline", whiteSpace: "nowrap" })}>{merchant.website}</a>
        ) : (
          <span className={css({ color: "var(--secondary-text)" })}>—</span>
        );
      }
    },
    {
      id: "mainMcc",
      label: "ОСНОВНОЙ MCC",
      accessor: (merchant) => merchant.mainMcc,
      renderCell: (merchant) => <span className={css({ fontWeight: "600" })}>{merchant.mainMcc}</span>
    },
    {
      id: "category",
      label: "КАТЕГОРИЯ",
      accessor: (merchant) => getCategoryLabel(merchant.spendingCategoryId),
      filterType: "select",
      renderCell: (merchant) => <span className={css({ fontWeight: "600", whiteSpace: "nowrap" })}>{getCategoryLabel(merchant.spendingCategoryId)}</span>
    },
    {
      id: "additionalMccs",
      label: "ДОП. MCC",
      accessor: (merchant) => merchant.additionalMccs || "",
      renderCell: (merchant) => {
        return (
          <span className={css({ color: "var(--secondary-text)", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })} title={merchant.additionalMccs}>
            {merchant.additionalMccs || "—"}
          </span>
        );
      }
    },
    {
      id: "actions",
      label: "ДЕЙСТВИЯ",
      accessor: (merchant) => merchant.id,
      sortable: false,
      filterable: false,
      align: "center",
      renderCell: (merchant) => {
        return (
          <div className={flex({ justify: "center", gap: "8px", align: "center" })}>
            <button
              onClick={() => setEditingMerchant(merchant)}
              className={css({ color: "#64748b", p: "6px", borderRadius: "8px", cursor: "pointer", border: "none", bg: "transparent", _hover: { color: "sberGreen", bg: "rgba(33, 160, 56, 0.05)" } })}
            >
              <Edit2 size={16} />
            </button>
            <DeleteMerchantButton merchantId={merchant.id} merchantName={merchant.name} />
          </div>
        );
      }
    }
  ], [categoryOptions]);

  if (!mounted) {
    return <div className={css({ py: "40px", textAlign: "center", color: "var(--secondary-text)" })}>Загрузка...</div>;
  }

  if (merchants.length === 0) {
    return (
      <div className={css({ py: "40px", textAlign: "center", color: "secondaryText", bg: "var(--card-bg)", borderRadius: "24px", border: "1px dashed", borderColor: "#e2e8f0" })}>
        Список мерчантов пуст
      </div>
    );
  }

  return (
    <div className={stack({ gap: "24px" })}>
      <div className={flex({ justify: "flex-end" })}>
        <ViewModeToggle initialMode={viewMode} onViewChange={handleViewChange} />
      </div>

      {viewMode === "cards" ? (
        <div className={grid({ columns: { base: 1, xl: 2 }, gap: "12px" })}>
          {merchants.map((merchant) => {
            const icon = getIconUrl(merchant);
            return (
              <div key={merchant.id} className="sber-card" style={{ padding: "16px" }}>
                <AdminFormWrapper
                  action={updateMerchant.bind(null, merchant.id)}
                  successMessage="Данные мерчанта обновлены"
                  className={stack({ gap: "16px" })}
                >
                  <div className={flex({ justify: "space-between", align: "start", gap: "12px" })}>
                    <div className={flex({ align: "center", gap: "12px", flex: 1, minW: 0 })}>
                      <div className={css({ w: "48px", h: "48px", bg: "#f8fafc", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid", borderColor: "#f1f5f9", flexShrink: 0 })}>
                        {icon ? (
                          <img src={icon} alt={merchant.name} className={css({ w: "full", h: "full", objectFit: "contain", p: "4px" })} />
                        ) : (
                          <Store size={20} color="#94a3b8" />
                        )}
                      </div>
                      <div className={stack({ gap: "4px", flex: 1, minW: 0 })}>
                        <div className={flex({ align: "center", gap: "8px" })}>
                          <input
                            name="name"
                            id={`merchant-name-${merchant.id}`}
                            defaultValue={merchant.name}
                            required
                            className={css({ fontWeight: "700", fontSize: "16px", color: "var(--foreground)", border: "none", bg: "transparent", borderBottom: "1px dashed", borderColor: "#e2e8f0", flex: 1, _focus: { borderColor: "sberGreen", outline: "none" } })}
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              const nameInput = document.getElementById(`merchant-name-${merchant.id}`) as HTMLInputElement;
                              handleAutoSearch(merchant.id, nameInput?.value || merchant.name);
                            }}
                            disabled={isSearching === merchant.id}
                            className={css({ p: "4px", color: "var(--secondary-text)", cursor: "pointer", _hover: { color: "sberGreen" }, _disabled: { opacity: 0.5 } })}
                            title="Автопоиск MCC"
                          >
                            {isSearching === merchant.id ? <Loader2 size={16} className={css({ animation: "spin 1s linear infinite" })} /> : <Search size={16} />}
                          </button>
                        </div>
                        <div className={grid({ columns: 2, gap: "8px", mt: "4px" })}>
                          <div className={stack({ gap: "2px" })}>
                            <label className={css({ fontSize: "9px", fontWeight: "800", color: "secondaryText" })}>MCC</label>
                            <SearchableSelect
                              name="mainMcc"
                              options={mccOptions}
                              required
                              key={`main-${merchant.id}-${mccOverrides[merchant.id]?.mainMcc}`}
                              defaultValue={mccOverrides[merchant.id]?.mainMcc || merchant.mainMcc}
                            />
                          </div>
                          <div className={stack({ gap: "2px" })}>
                            <label className={css({ fontSize: "9px", fontWeight: "800", color: "secondaryText" })}>КАТЕГОРИЯ</label>
                            <SearchableSelect
                              name="spendingCategoryId"
                              options={categoryOptions}
                              defaultValue={merchant.spendingCategoryId?.toString()}
                              placeholder="Категория"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={css({ flexShrink: 0 })}>
                      <button type="submit" className={css({ p: "8px", color: "sberGreen", cursor: "pointer", _hover: { bg: "#f0fdf4", borderRadius: "full" }, WebkitTapHighlightColor: "transparent" })}>
                        <Save size={20} />
                      </button>
                    </div>
                  </div>

                  <div className={grid({ columns: 2, gap: "12px" })}>
                    <div className={stack({ gap: "4px" })}>
                      <label className="sber-label">САЙТ</label>
                      <input
                        name="website"
                        defaultValue={merchant.website || ""}
                        className="sber-input"
                        style={{ fontSize: "12px", padding: "8px" }}
                      />
                    </div>
                    <div className={stack({ gap: "4px" })}>
                      <label className="sber-label">ЛОГО (URL)</label>
                      <input
                        name="logo"
                        defaultValue={merchant.logo || ""}
                        className="sber-input"
                        style={{ fontSize: "12px", padding: "8px" }}
                      />
                    </div>
                  </div>

                  <div className={stack({ gap: "4px" })}>
                    <label className={css({ fontSize: "10px", fontWeight: "800", color: "secondaryText", textTransform: "uppercase" })}>Дополнительные MCC</label>
                    <input
                      name="additionalMccs"
                      key={`add-${merchant.id}-${mccOverrides[merchant.id]?.additionalMccs}`}
                      defaultValue={mccOverrides[merchant.id]?.additionalMccs || merchant.additionalMccs}
                      className={css({ fontSize: "12px", color: "var(--foreground)", bg: "var(--input-bg)", px: "8px", py: "4px", borderRadius: "8px", border: "none", width: "full", _focus: { outline: "none", ring: "1px solid gray" } })}
                    />
                  </div>
                </AdminFormWrapper>

                <div className={flex({ justify: "flex-end", mt: "12px" })}>
                  <DeleteMerchantButton merchantId={merchant.id} merchantName={merchant.name} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <UniversalTable
          data={merchants}
          columns={columns}
          localStorageKey="admin_merchants_table"
          rowKey={(merchant) => merchant.id}
        />
      )}

      {/* Modal for table editing */}
      {editingMerchant && (
        <div className={css({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bg: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)",
          p: "16px"
        })}>
          <div className="sber-card" style={{ width: "100%", maxWidth: "500px", position: "relative", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}>
            <button
              onClick={() => {
                setEditingMerchant(null);
                setModalMccOverride(null);
              }}
              className={css({ position: "absolute", top: "16px", right: "16px", border: "none", bg: "transparent", cursor: "pointer", color: "var(--secondary-text)", _hover: { color: "var(--foreground)" } })}
            >
              <X size={20} />
            </button>

            <div className={flex({ align: "center", gap: "10px", mb: "24px" })}>
              <h2 className={css({ fontSize: "17px", fontWeight: "700", color: "var(--foreground)" })}>Редактировать мерчанта</h2>
            </div>

            <AdminFormWrapper
              action={async (formData) => {
                await updateMerchant(editingMerchant.id, formData);
                setEditingMerchant(null);
                setModalMccOverride(null);
              }}
              successMessage="Данные мерчанта обновлены"
              className={stack({ gap: "20px" })}
            >
              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">НАЗВАНИЕ ТОРГОВОЙ ТОЧКИ</label>
                <div className={flex({ align: "center", gap: "10px" })}>
                  <input
                    name="name"
                    id="modal-merchant-name"
                    type="text"
                    required
                    defaultValue={editingMerchant.name}
                    placeholder="Например, Ozon"
                    className="sber-input"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nameInput = document.getElementById("modal-merchant-name") as HTMLInputElement;
                      handleAutoSearch(editingMerchant.id, nameInput?.value || editingMerchant.name);
                    }}
                    disabled={isSearching === editingMerchant.id}
                    className={css({ p: "12px", bg: "var(--card-bg)", borderRadius: "14px", border: "1px solid var(--border-color)", color: "var(--secondary-text)", cursor: "pointer", _hover: { color: "sberGreen", borderColor: "sberGreen" }, _disabled: { opacity: 0.5 } })}
                  >
                    {isSearching === editingMerchant.id ? <Loader2 size={18} className={css({ animation: "spin 1s linear infinite" })} /> : <Search size={18} />}
                  </button>
                </div>
              </div>

              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">САЙТ (ДЛЯ АВТО-ИКОНКИ)</label>
                <input
                  name="website"
                  type="text"
                  defaultValue={editingMerchant.website || ""}
                  placeholder="ozon.ru"
                  className="sber-input"
                />
              </div>

              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ОСНОВНОЙ MCC</label>
                <SearchableSelect
                  name="mainMcc"
                  options={mccOptions}
                  required
                  key={`modal-main-${editingMerchant.id}-${modalMccOverride?.mainMcc}`}
                  defaultValue={modalMccOverride?.mainMcc || editingMerchant.mainMcc}
                />
              </div>

              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">КАТЕГОРИЯ (ГЛОБАЛЬНАЯ)</label>
                <SearchableSelect
                  name="spendingCategoryId"
                  options={categoryOptions}
                  defaultValue={editingMerchant.spendingCategoryId?.toString()}
                  placeholder="Выберите категорию для статистики..."
                />
              </div>

              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">ДОПОЛНИТЕЛЬНЫЕ MCC (ПРОИЗВОЛЬНЫЙ ТЕКСТ)</label>
                <textarea
                  name="additionalMccs"
                  key={`modal-add-${editingMerchant.id}-${modalMccOverride?.additionalMccs}`}
                  defaultValue={modalMccOverride?.additionalMccs || editingMerchant.additionalMccs}
                  placeholder="Введите MCC через запятую или пробел."
                  className="sber-input"
                  style={{ minHeight: "80px", paddingTop: "12px" }}
                />
              </div>

              <div className={stack({ gap: "6px" })}>
                <label className="sber-label">URL ЛОГОТИПА (РУЧНОЙ ВВОД)</label>
                <input
                  name="logo"
                  type="text"
                  defaultValue={editingMerchant.logo || ""}
                  placeholder="https://example.com/logo.png"
                  className="sber-input"
                />
              </div>

              <button type="submit" className="sber-button">
                Сохранить изменения
              </button>
            </AdminFormWrapper>
          </div>
        </div>
      )}
    </div>
  );
}
