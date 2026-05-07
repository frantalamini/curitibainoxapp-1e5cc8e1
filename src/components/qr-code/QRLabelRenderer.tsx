import { QRCodeSVG } from "qrcode.react";
import type { QRTemplate } from "@/hooks/useQRTemplates";

export interface LabelData {
  qrValue: string;
  productName?: string;
  modelCode?: string;
  serialNumber?: string;
  lotNumber?: string;
}

function resolveVariables(text: string, data: LabelData): string {
  return text
    .replace(/\{produto\}/g, data.productName || "")
    .replace(/\{modelo\}/g, data.modelCode || "")
    .replace(/\{serial\}/g, data.serialNumber || "")
    .replace(/\{lote\}/g, data.lotNumber || "");
}

function getAbsolutePosition(
  pos: number,
  containerW: number,
  containerH: number,
  elW: number,
  elH: number,
  margin: number,
): { left: number; top: number } {
  const col = pos % 3;
  const row = Math.floor(pos / 3);
  const left =
    col === 0
      ? margin
      : col === 1
        ? (containerW - elW) / 2
        : containerW - elW - margin;
  const top =
    row === 0
      ? margin
      : row === 1
        ? (containerH - elH) / 2
        : containerH - elH - margin;
  return { left, top };
}

export function QRLabelRenderer({
  template,
  data,
  widthPx = 280,
  logoUrl,
}: {
  template: QRTemplate;
  data: LabelData;
  widthPx?: number;
  logoUrl?: string | null;
}) {
  const heightPx = Math.round(
    widthPx * (template.height_cm / template.width_cm),
  );
  const pxPerCm = widthPx / template.width_cm;
  const margin = Math.round(pxPerCm * 0.15);
  const logoSizePx = template.logo_size_cm * pxPerCm;
  const qrSizePx = template.qr_size_cm * pxPerCm;
  const qrPad = 4;
  const qrBlockW = qrSizePx + qrPad * 2;
  const qrBlockH = qrSizePx + qrPad * 2;

  const qrCol = template.qr_position % 3;
  const qrPos = getAbsolutePosition(
    template.qr_position,
    widthPx,
    heightPx,
    qrBlockW,
    qrBlockH,
    margin,
  );

  // --- content area: the horizontal strip NOT occupied by the QR ---
  let contentLeft: number;
  let contentWidth: number;
  if (qrCol === 0) {
    contentLeft = qrPos.left + qrBlockW + margin;
    contentWidth = widthPx - contentLeft - margin;
  } else if (qrCol === 2) {
    contentLeft = margin;
    contentWidth = qrPos.left - margin * 2;
  } else {
    contentLeft = qrPos.left + qrBlockW + margin;
    contentWidth = widthPx - contentLeft - margin;
    if (contentWidth < widthPx * 0.3) {
      contentLeft = margin;
      contentWidth = qrPos.left - margin * 2;
    }
  }
  if (contentWidth < 0) contentWidth = widthPx * 0.4;

  // --- logo position within content area ---
  const logoH = logoSizePx * 0.3;
  const logoRow = Math.floor(template.logo_position / 3);
  const logoCol = template.logo_position % 3;
  const logoTop =
    logoRow === 0
      ? margin
      : logoRow === 1
        ? (heightPx - logoH) / 2
        : heightPx - logoH - margin;
  const logoJustify =
    logoCol === 0 ? "flex-start" : logoCol === 1 ? "center" : "flex-end";

  const brandColor = template.bg_color || "#18487A";

  const textConfig = (template.extra_elements || []).find(
    (e: any) => e?.type === "text_config",
  );
  const textVAlign: string = textConfig?.v_align || "center";

  const logoGap = Math.max(2, pxPerCm * 0.08);
  let textTop = margin;
  let textHeight = heightPx - margin * 2;
  if (logoRow === 0) {
    textTop = logoTop + logoH + logoGap;
    textHeight = heightPx - margin - textTop;
  } else if (logoRow === 2) {
    textTop = margin + heightPx * 0.16;
    textHeight = logoTop - logoGap - textTop;
  }
  if (textHeight < 10) textHeight = heightPx - margin * 2;

  return (
    <div
      className="qr-label"
      style={{
        width: widthPx,
        height: heightPx,
        position: "relative",
        overflow: "hidden",
        border: "1px solid #e5e7eb",
        backgroundColor: "white",
        borderRadius: 3,
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Background band */}
      {template.bg_enabled && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${template.bg_width_pct}%`,
            background: `linear-gradient(180deg, ${brandColor}, ${brandColor}dd)`,
          }}
        />
      )}

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          left: contentLeft,
          top: logoTop,
          width: contentWidth,
          height: logoH,
          display: "flex",
          alignItems: "center",
          justifyContent: logoJustify,
          zIndex: 20,
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              height: logoH,
              maxWidth: contentWidth,
              objectFit: "contain",
            }}
          />
        ) : (
          <div
            style={{
              background: brandColor,
              borderRadius: 3,
              padding: `${Math.max(1, pxPerCm * 0.04)}px ${Math.max(4, pxPerCm * 0.12)}px`,
            }}
          >
            <span
              style={{
                fontSize: Math.max(8, logoSizePx * 0.2),
                fontWeight: 700,
                color: "white",
                letterSpacing: "0.15em",
              }}
            >
              CI
            </span>
          </div>
        )}
      </div>

      {/* QR Code */}
      <div
        style={{
          position: "absolute",
          left: qrPos.left,
          top: qrPos.top,
          zIndex: 10,
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            borderRadius: 3,
            padding: qrPad,
            boxShadow: "0 1px 3px rgba(0,0,0,.12)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <QRCodeSVG value={data.qrValue} size={Math.round(qrSizePx)} />
        </div>
      </div>

      {/* Text elements */}
      <div
        style={{
          position: "absolute",
          left: contentLeft,
          top: textTop,
          width: contentWidth,
          height: textHeight,
          display: "flex",
          flexDirection: "column",
          justifyContent:
            textVAlign === "top"
              ? "flex-start"
              : textVAlign === "bottom"
                ? "flex-end"
                : "center",
          gap: Math.max(1, pxPerCm * 0.04),
          zIndex: 10,
          overflow: "hidden",
        }}
      >
        {template.text_elements.map((el, i) => {
          const content = resolveVariables(el.content, data);
          const fontSizePx = Math.max(7, el.font_size * pxPerCm * 0.0353);
          return (
            <div
              key={i}
              style={{
                fontSize: fontSizePx,
                fontWeight: el.bold ? 700 : 400,
                color: el.color,
                lineHeight: 1.25,
                whiteSpace: "pre-line",
                textAlign: el.align || "left",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {content || ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
