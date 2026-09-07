import {
  HeroSection,
  CredentialsBar,
  ServicesSection,
  VideoSection,
  BooksSection,
  PhotoGallery,
  TestimonialsSection,
  ServicesTabsSection,
  WorkshopTopicsSection,
  PP2DiaryBanner,
  TotalVocalBanner,
  FAQSection,
  ContactSection,
} from "@/components/landing";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CredentialsBar />
      <TotalVocalBanner />
      <ServicesSection />
      <VideoSection />
      <BooksSection />
      <PhotoGallery />
      <TestimonialsSection />
      <ServicesTabsSection />
      <WorkshopTopicsSection />
      <PP2DiaryBanner />
      <FAQSection />
      <ContactSection />
    </>
  );
}
