const SKOOL_BASE = "https://www.skool.com/deke";

/**
 * Build the Skool join link with UTM tracking so we can tell which placement
 * actually drives signups.
 *
 * `placement` is the utm_content value and should be unique per CTA, e.g.
 * "tv_hero", "site_nav", "home_banner". Everything shares one source/medium/
 * campaign so the placements roll up together in analytics.
 */
export function skoolUrl(placement: string): string {
  const params = new URLSearchParams({
    utm_source: "dekesharon",
    utm_medium: "website",
    utm_campaign: "total_vocal",
    utm_content: placement,
  });

  return `${SKOOL_BASE}?${params.toString()}`;
}
