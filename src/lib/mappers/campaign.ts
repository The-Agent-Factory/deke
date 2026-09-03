import { Campaign as PrismaCampaign } from '@prisma/client';
import { Campaign as ComponentCampaign } from '@/components/campaigns/campaign-table';

type CampaignWithCount = PrismaCampaign & {
  _count: {
    leads: number;
  };
  booking?: {
    id: string;
    serviceType: string;
    location: string | null;
    // Null for bookings created without a contact attached.
    contact: {
      firstName: string;
      lastName: string;
    } | null;
  } | null;
};

export function mapCampaignToComponent(
  campaign: CampaignWithCount
): ComponentCampaign {
  return {
    id: campaign.id,
    name: campaign.name,
    location: campaign.baseLocation,
    radiusMiles: campaign.radius,
    status: campaign.status as ComponentCampaign['status'],
    leadCount: campaign._count.leads,
    createdAt: campaign.createdAt.toISOString(),
    booking: campaign.booking ? {
      id: campaign.booking.id,
      clientName: campaign.booking.contact ? `${campaign.booking.contact.firstName} ${campaign.booking.contact.lastName}` : 'Unknown Contact',
      serviceType: campaign.booking.serviceType,
    } : null,
  };
}

export function mapCampaignsToComponent(
  campaigns: CampaignWithCount[]
): ComponentCampaign[] {
  return campaigns.map(mapCampaignToComponent);
}
