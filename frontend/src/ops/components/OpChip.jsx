import { CHIP_NO_DOT, chipFamilyTitle, chipVariant, VARIANT } from "../../lib/chipContract.js";

/**
 * Contract status chip (emoji + label; «Справка → Обозначения»).
 * Default renders the emoji in place of the dot (ai-status--emoji).
 */
export function OpChip({ chip, variant, emojiOnly = false, iconLg = false, className, title }) {
  if (!chip) return null;
  const cls = [
    "ai-status",
    variant || VARIANT.MUTED,
    // Contract chips always carry the emoji instead of the dot marker
    // (AIC parity: ai-status--emoji hides the ::before dot in every variant).
    CHIP_NO_DOT,
    iconLg ? "ai-status--icon-lg" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} title={title}>
      {emojiOnly ? chip.emoji : `${chip.emoji} ${chip.label}`}
    </span>
  );
}

/** Convenience: chip from a concept map + code (null-safe).
 *  Двойная подсказка «Параметр: Значение» — по умолчанию из контракта. */
export function OpChipFor({ map, variantMap, code, ...rest }) {
  const chip = map?.[code];
  return (
    <OpChip
      chip={chip}
      variant={chipVariant(variantMap, code)}
      {...rest}
      title={rest.title ?? chipFamilyTitle(map, code)}
    />
  );
}