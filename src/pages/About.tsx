import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Users, 
  Target, 
  Globe2, 
  Leaf, 
  Award,
  Heart,
  ArrowRight
} from "lucide-react";

const teamMembers = [
  { name: "Priya Sharma", role: "Founder & CEO", description: "Former AgTech researcher with 10+ years in agriculture" },
  { name: "Rajesh Kumar", role: "CTO", description: "Building scalable tech solutions for rural India" },
  { name: "Anita Patel", role: "Head of Operations", description: "Expert in supply chain and logistics management" },
  { name: "Vikram Singh", role: "Product Lead", description: "Focused on farmer-first product design" },
];

const values = [
  { icon: Heart, title: "Farmer First", description: "Every decision we make prioritizes the welfare of our farming community." },
  { icon: Target, title: "Transparency", description: "Clear pricing, honest communication, and fair practices for all." },
  { icon: Globe2, title: "Sustainability", description: "Building an ecosystem that benefits the environment and future generations." },
  { icon: Award, title: "Quality", description: "Ensuring the highest standards from farm to market." },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-earth">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Leaf className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">About Us</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-6">
            Empowering India's <span className="text-gradient-hero">Agricultural</span> Future
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AgriNext Gen is on a mission to revolutionize how farmers, buyers, and logistics partners 
            connect across India, creating a transparent and efficient agricultural marketplace.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-display font-bold mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                We believe every farmer deserves fair access to markets, transparent pricing, 
                and efficient logistics. AgriNext Gen bridges the gap between rural farms and 
                urban markets through technology.
              </p>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Founded in 2024, we've grown from a small team with a big vision to a platform 
                serving thousands of farmers across Karnataka, Maharashtra, and beyond.
              </p>
              <Button variant="hero" asChild>
                <Link to="/signup" className="gap-2">
                  Join Our Platform <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">5000+</div>
                <div className="text-muted-foreground">Farmers</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">200+</div>
                <div className="text-muted-foreground">Buyers</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">50+</div>
                <div className="text-muted-foreground">Districts</div>
              </Card>
              <Card className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">₹10Cr+</div>
                <div className="text-muted-foreground">Transactions</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 px-4 bg-gradient-card">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              The principles that guide everything we do at AgriNext Gen.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-gradient-hero flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Passionate individuals working to transform Indian agriculture.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <Card key={member.name} className="text-center p-6">
                <div className="w-20 h-20 rounded-full bg-gradient-hero mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="font-display font-semibold text-lg">{member.name}</h3>
                <p className="text-primary text-sm font-medium mb-2">{member.role}</p>
                <p className="text-muted-foreground text-sm">{member.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-hero">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-primary-foreground mb-6">
            Ready to Transform Your Agricultural Journey?
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of farmers and buyers already benefiting from our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/signup">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
