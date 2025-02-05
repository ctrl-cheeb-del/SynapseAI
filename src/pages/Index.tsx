import { Button } from "@/components/ui/button";
import { Header } from "@/components/Header";
import { ArrowRight, FileText, Brain, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.2
    }
  }
};

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Unified background gradient */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-2/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-3xl" />
      </div>
      
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-32 flex flex-col items-center text-center relative">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="relative"
          >
            <motion.h1
              variants={fadeIn}
              className="text-6xl md:text-7xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400"
            >
              Transform Your Study Material with AI
            </motion.h1>

            <motion.p
              variants={fadeIn}
              className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto"
            >
              Upload your PDF lecture slides and instantly get AI-generated flashcards, quizzes, and summaries to supercharge your learning.
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="flex gap-4 justify-center"
            >
              <Button
                size="lg"
                className="group transition-all duration-300 hover:scale-105"
                onClick={handleGetStarted}
              >
                Get Started
                <ArrowRight className="ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="py-32 relative">
          <div className="container mx-auto px-4">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-center mb-16"
            >
              How It Works
            </motion.h2>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8"
            >
              <FeatureCard
                icon={FileText}
                title="Upload PDFs"
                description="Simply upload your PDF lecture slides and let our AI do the rest. No manual work needed."
              />
              <FeatureCard
                icon={Brain}
                title="Automatic Generation"
                description="Our AI instantly creates flashcards, summaries, and study guides from your slides."
              />
              <FeatureCard
                icon={BookOpen}
                title="Learn & Test"
                description="Practice with auto-generated quizzes, review flashcards, and master your material efficiently."
              />
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

const FeatureCard = ({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) => {
  return (
    <motion.div
      variants={fadeIn}
      whileHover={{ scale: 1.02 }}
      className="group bg-card/50 backdrop-blur-sm p-8 rounded-2xl border border-border/50 hover:border-primary/50 transition-colors"
    >
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </motion.div>
  );
};

export default Index;