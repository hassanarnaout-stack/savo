import { prisma } from "@/lib/prisma";
import { CampaignService } from "@/lib/services/campaign-service";

/**
 * TreasureMapService — Phase 5.2, section 7 ("ready structure" per the
 * brief, not a fully game-designed feature yet).
 *
 * A map is a sequence of nodes in `config.nodes`:
 *   { id, category: <category slug>, task: <description>, reward, order }
 *
 * Completion for the "buy a product from this category" task type is
 * auto-detected against real Order data (the exact example given in the
 * brief: "اشترِ منتج من القسم"). Other task shapes can be added the same
 * way later — this is the one concrete, working task type this phase
 * demonstrates; the node structure itself is what's meant to be ready
 * for more.
 */

export interface MapNode {
  id: string;
  category: string; // category slug
  task: string; // display description
  reward: { type: string; label: string; value: number | null };
  order: number;
}

export class TreasureMapService {
  static async getNodesWithProgress(userId: string) {
    const campaign = await CampaignService.getBySlug("treasure-map");
    if (!campaign || campaign.status !== "ACTIVE") return { available: false, nodes: [] as any[] };

    const nodes = ((campaign.config as any)?.nodes ?? []) as MapNode[];
    const completedEvents = await prisma.campaignEvent.findMany({
      where: { userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED" },
      select: { metadata: true },
    });
    const completedNodeIds = new Set(completedEvents.map((e) => (e.metadata as any)?.nodeId).filter(Boolean));

    const nodesWithProgress = await Promise.all(
      nodes
        .sort((a, b) => a.order - b.order)
        .map(async (node) => ({
          ...node,
          completed: completedNodeIds.has(node.id),
          eligible: completedNodeIds.has(node.id) ? true : await this.hasCompletedCategoryPurchase(userId, node.category),
        }))
    );

    return { available: true, campaign, nodes: nodesWithProgress };
  }

  /** Real check: has this user ever purchased a product from this category? */
  private static async hasCompletedCategoryPurchase(userId: string, categorySlug: string): Promise<boolean> {
    const count = await prisma.orderItem.count({
      where: {
        product: { category: { slug: categorySlug } },
        supplierOrder: { order: { userId } },
      },
    });
    return count > 0;
  }

  /** Claims a node's reward once its underlying task is genuinely satisfied — never trusts the client's claim alone. */
  static async claimNode(userId: string, nodeId: string) {
    const campaign = await CampaignService.getBySlug("treasure-map");
    if (!campaign || campaign.status !== "ACTIVE") throw new Error("Treasure Map isn't available right now.");

    const nodes = ((campaign.config as any)?.nodes ?? []) as MapNode[];
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) throw new Error("Unknown map node.");

    const alreadyClaimed = await prisma.campaignEvent.findFirst({
      where: { userId, campaignId: campaign.id, eventType: "REWARD_RECEIVED", metadata: { path: ["nodeId"], equals: nodeId } },
    });
    if (alreadyClaimed) throw new Error("You've already claimed this stamp.");

    const eligible = await this.hasCompletedCategoryPurchase(userId, node.category);
    if (!eligible) throw new Error("Complete the task first — buy a product from this category.");

    await CampaignService.recordEvent({
      userId,
      campaignId: campaign.id,
      eventType: "REWARD_RECEIVED",
      metadata: { nodeId, ...node.reward },
    });

    return node.reward;
  }
}
