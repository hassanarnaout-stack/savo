import { prisma } from "@/lib/prisma";

/**
 * AdTemplateService — Phase 5.3 §4
 *
 * Generates real, valid SVG ad images (not a mockup/placeholder) that
 * embed the product photo via a standard SVG <image> href, so the
 * output is an actual publishable graphic — viewable in a browser,
 * downloadable as .svg, and convertible to PNG by any image tool.
 */

export interface TemplateConfig {
  productName: string;
  imageUrl: string;
  price?: string;
  discountPercent?: number;
  timerText?: string;
  ctaText: string;
  backgroundColor?: string;
}

const THEME: Record<string, { bg: string; accent: string; badge: string }> = {
  PRODUCT_CARD: { bg: "#FDFBF6", accent: "#0B3D2E", badge: "#D4AF37" },
  FLASH_DEAL: { bg: "#7C1D1D", accent: "#FFFFFF", badge: "#FFB020" },
  MYSTERY_BOX: { bg: "#0B3D2E", accent: "#FFFFFF", badge: "#D4AF37" },
  NEW_ARRIVAL: { bg: "#1E3A5F", accent: "#FFFFFF", badge: "#D4AF37" },
  DISCOUNT: { bg: "#0B3D2E", accent: "#FFFFFF", badge: "#FF4D4D" },
  SAVEO_PLUS: { bg: "#1A1A2E", accent: "#D4AF37", badge: "#D4AF37" },
};

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export class AdTemplateService {
  static generateSvg(templateType: keyof typeof THEME, config: TemplateConfig): string {
    const theme = THEME[templateType] ?? THEME.PRODUCT_CARD;
    const bg = config.backgroundColor ?? theme.bg;
    const name = escapeXml(config.productName);
    const cta = escapeXml(config.ctaText);

    return `<svg width="1080" height="1080" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
  <rect width="1080" height="1080" fill="${bg}"/>
  <defs>
    <clipPath id="imgClip"><rect x="140" y="120" width="800" height="560" rx="24"/></clipPath>
  </defs>

  <text x="60" y="70" font-family="Arial, sans-serif" font-size="36" font-weight="900" fill="${theme.accent}">saveo</text>

  <rect x="140" y="120" width="800" height="560" rx="24" fill="#ffffff"/>
  <image href="${escapeXml(config.imageUrl)}" x="140" y="120" width="800" height="560" preserveAspectRatio="xMidYMid slice" clip-path="url(#imgClip)"/>

  ${config.discountPercent ? `
  <circle cx="880" cy="160" r="70" fill="${theme.badge}"/>
  <text x="880" y="150" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#1a1a1a">-${config.discountPercent}%</text>
  <text x="880" y="185" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#1a1a1a">OFF</text>
  ` : ""}

  <text x="540" y="760" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="900" fill="${theme.accent}">${name}</text>

  ${config.price ? `<text x="540" y="830" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="800" fill="${theme.badge}">${escapeXml(config.price)}</text>` : ""}

  ${config.timerText ? `
  <rect x="340" y="860" width="400" height="60" rx="30" fill="#00000030"/>
  <text x="540" y="898" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="${theme.accent}">⏰ ${escapeXml(config.timerText)}</text>
  ` : ""}

  <rect x="340" y="950" width="400" height="90" rx="45" fill="${theme.badge}"/>
  <text x="540" y="1006" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="900" fill="#1a1a1a">${cta}</text>
</svg>`;
  }

  static async createAndSave(params: {
    templateType: string;
    productId?: string;
    campaignId?: string;
    config: TemplateConfig;
    createdByUserId: string;
  }) {
    const svgContent = this.generateSvg(params.templateType as any, params.config);
    return prisma.generatedAd.create({
      data: {
        templateType: params.templateType as any,
        productId: params.productId,
        campaignId: params.campaignId,
        config: params.config as any,
        svgContent,
        createdByUserId: params.createdByUserId,
      },
    });
  }

  static async getAll(filters?: { productId?: string; campaignId?: string }) {
    return prisma.generatedAd.findMany({
      where: { ...(filters?.productId ? { productId: filters.productId } : {}), ...(filters?.campaignId ? { campaignId: filters.campaignId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}
