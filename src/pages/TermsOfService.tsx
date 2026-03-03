import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-content" className="container mx-auto px-4 max-w-4xl py-16">
        <h1 className="text-4xl font-display font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using AgriNext Gen ("Platform", "Service"), you agree to be bound by these Terms of
              Service. These terms are governed by the Information Technology Act 2000, Consumer Protection Act 2019,
              and other applicable Indian laws. If you do not agree, please do not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Platform Description</h2>
            <p className="text-muted-foreground leading-relaxed">
              AgriNext Gen is an agricultural marketplace and operations platform connecting farmers, buyers, field
              agents, and logistics partners in India. The Platform is currently in a pilot phase serving Karnataka.
              We facilitate connections and transactions but are not a party to transactions between users.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. User Roles & Responsibilities</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Farmers</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Must provide accurate information about crops, quantities, and quality</li>
                  <li>Are responsible for fulfilling confirmed orders</li>
                  <li>Must comply with applicable agricultural regulations</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Buyers</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Must provide accurate business and payment information</li>
                  <li>Are responsible for completing payments for confirmed purchases</li>
                  <li>Must comply with applicable trade and licensing requirements</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Field Agents</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Must act in the best interests of the farmers they represent</li>
                  <li>Are responsible for accurate data entry and reporting</li>
                  <li>Must maintain appropriate licenses if required by law</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Logistics Partners</h3>
                <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
                  <li>Must maintain valid transport licenses and vehicle documentation</li>
                  <li>Are responsible for safe and timely delivery of produce</li>
                  <li>Must comply with road transport regulations</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Marketplace Rules</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Users must not:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Post false, misleading, or fraudulent listings</li>
              <li>Manipulate prices or engage in anti-competitive practices</li>
              <li>Harass, threaten, or harm other platform users</li>
              <li>Circumvent the platform to avoid fees (once applicable)</li>
              <li>Use the platform for any illegal activities</li>
              <li>Attempt to gain unauthorized access to other users' accounts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Payments & Transactions</h2>
            <p className="text-muted-foreground leading-relaxed">
              During the pilot phase, the Platform facilitates transaction records. Actual payments may occur directly
              between parties or through integrated payment gateways. AgriNext Gen is not responsible for payment
              disputes arising from third-party payment failures. All transactions are subject to applicable GST and
              other Indian tax regulations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted under Indian law, AgriNext Gen shall not be liable for: indirect,
              incidental, or consequential damages; losses arising from crop quality disputes; or failures caused by
              third-party services, natural disasters, or force majeure events. Our total liability shall not exceed
              the amount paid by you (if any) to use the Platform in the three months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform, its design, code, and content are owned by AgriNext Gen and protected under applicable
              intellectual property laws. Users retain ownership of the data they upload but grant AgriNext Gen a
              licence to use it to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Governing Law & Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of India. Any disputes shall first be attempted to be resolved
              through good-faith negotiation. If unresolved within 30 days, disputes shall be subject to the
              jurisdiction of courts in Bengaluru, Karnataka. Consumer disputes may be referred to the appropriate
              Consumer Disputes Redressal Forum under the Consumer Protection Act 2019.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. Significant changes will be notified via email or platform
              notification. Continued use of the Platform after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">For questions about these Terms, contact us at:</p>
            <div className="mt-3 p-4 bg-muted rounded-lg">
              <p className="font-medium">AgriNext Gen</p>
              <p className="text-muted-foreground">Email: <a href="mailto:teamAgriNext.Gen@gmail.com" className="text-primary hover:underline">teamAgriNext.Gen@gmail.com</a></p>
              <p className="text-muted-foreground">Address: Bengaluru, Karnataka, India</p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;
