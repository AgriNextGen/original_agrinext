import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-content" className="container mx-auto px-4 max-w-4xl py-16">
        <h1 className="text-4xl font-display font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: January 2025</p>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              AgriNext Gen ("we", "our", or "us") is committed to protecting the privacy of farmers, buyers, agents, and
              logistics partners who use our platform. This Privacy Policy explains how we collect, use, store, and share
              your personal data in compliance with India's Digital Personal Data Protection Act 2023 (DPDP Act).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">2. Data We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect the following categories of personal data:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Identity data:</strong> Name, phone number, Aadhaar/PAN (for verified accounts), profile photo</li>
              <li><strong>Location data:</strong> Farm location, service area, district/taluk information</li>
              <li><strong>Transaction data:</strong> Listings, orders, payments, logistics records</li>
              <li><strong>Device data:</strong> IP address, browser type, device identifiers</li>
              <li><strong>Usage data:</strong> Pages visited, features used, session duration</li>
              <li><strong>Communication data:</strong> Messages between platform participants</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Data</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use your personal data to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Provide and improve our agricultural marketplace platform</li>
              <li>Facilitate transactions between farmers, buyers, and logistics partners</li>
              <li>Send important notifications about your account and transactions</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Comply with legal obligations under Indian law</li>
              <li>Provide customer support and resolve disputes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">4. Data Storage & Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data is stored securely on servers hosted in India. We use industry-standard encryption (AES-256 at
              rest, TLS 1.3 in transit) and follow security best practices. Access to personal data is restricted to
              authorized personnel on a need-to-know basis. We retain data for as long as your account is active or as
              required by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell your personal data. We may share data with:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Other platform participants (e.g., buyers can see farmer listings)</li>
              <li>Payment processors for transaction processing</li>
              <li>Government authorities when legally required</li>
              <li>Service providers who assist in operating our platform (under data processing agreements)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">6. Your Rights (DPDP Act 2023)</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">Under the Digital Personal Data Protection Act 2023, you have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of your personal data we hold</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (subject to legal obligations)</li>
              <li><strong>Grievance redressal:</strong> File a complaint with our Data Protection Officer</li>
              <li><strong>Nomination:</strong> Nominate another person to exercise rights on your behalf</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">7. Cookie Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management, and analytics cookies (with your
              consent) to improve our platform. You can manage cookie preferences in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              AgriNext Gen is not intended for use by individuals under 18 years of age. We do not knowingly collect
              personal data from minors.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related queries, to exercise your rights, or to file a grievance, please contact our Data
              Protection Officer:
            </p>
            <div className="mt-3 p-4 bg-muted rounded-lg">
              <p className="font-medium">AgriNext Gen — Data Protection Officer</p>
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

export default PrivacyPolicy;
