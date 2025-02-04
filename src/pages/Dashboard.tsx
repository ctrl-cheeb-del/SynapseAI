import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, FileText, Upload, Clock, Brain, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreateModuleDialog } from "@/components/CreateModuleDialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { fetchModules, deleteModule } from "@/lib/api";

interface Module {
  id: string;
  title: string;
  description: string;
  materials: {
    id: string;
    title: string;
    date: string;
    type: string;
    quiz?: {
      question: string;
      options: string[];
      correctAnswer: number;
    }[];
  }[];
}

const Dashboard = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showModuleQuizDialog, setShowModuleQuizDialog] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadModules();
  }, [user]);

  const loadModules = async () => {
    try {
      const modulesData = await fetchModules();
      setModules(modulesData);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast({
        title: "Error",
        description: "Failed to load modules. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = (answers: number[], questions: any[]) => {
    if (!questions?.length) return 0;
    const correctAnswers = answers.reduce((acc, answer, index) => {
      return acc + (answer === questions[index].correctAnswer ? 1 : 0);
    }, 0);
    return (correctAnswers / questions.length) * 100;
  };

  const getAllQuestions = (module: Module) => {
    return module.materials.flatMap((material, mIndex) => 
      (material.quiz || []).map((question, qIndex) => ({
        ...question,
        materialTitle: material.title,
        materialIndex: mIndex,
        questionIndex: qIndex
      }))
    );
  };

  const handleAnswerSelect = (oIndex: number) => {
    if (showAnswer) return; // Prevent changing answer after showing feedback
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuestionIndex] = oIndex;
    setQuizAnswers(newAnswers);
    setShowAnswer(true);
  };

  const handleNextQuestion = () => {
    const allQuestions = selectedModule ? getAllQuestions(selectedModule) : [];
    setShowAnswer(false);
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizSubmitted(true);
      const score = calculateScore(quizAnswers, allQuestions);
      toast({
        title: "Quiz Completed!",
        description: `Your score: ${score.toFixed(1)}%`,
      });
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setShowAnswer(false);
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleDeleteModule = async () => {
    if (!moduleToDelete) return;

    try {
      await deleteModule(moduleToDelete.id);
      toast({
        title: "Success",
        description: "Module deleted successfully",
      });
      loadModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      toast({
        title: "Error",
        description: "Failed to delete module. Please try again.",
        variant: "destructive",
      });
    } finally {
      setModuleToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading modules...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Modules</h1>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="flex items-center gap-2"
          >
            <Book className="h-5 w-5" />
            Create Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">No modules yet</h2>
            <p className="text-gray-500 mb-4">Create your first module to get started</p>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Module</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => (
              <Card 
                key={module.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer h-[200px] relative group"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModuleToDelete(module);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
                <div 
                  className="p-6 h-full flex flex-col justify-between"
                  onClick={() => navigate(`/module/${module.id}`)}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Book className="h-5 w-5 text-primary flex-shrink-0" />
                      <h3 className="text-lg font-semibold truncate">{module.title}</h3>
                    </div>
                    {module.description && (
                      <p className="text-sm text-gray-500 truncate mb-2">{module.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {module.materials.length} Materials
                      </span>
                      <span className="flex items-center gap-1">
                        <Brain className="h-4 w-4" />
                        {module.materials.filter(m => m.quiz?.length).length} Quizzes
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedModule(module);
                      setQuizAnswers([]);
                      setQuizSubmitted(false);
                      setCurrentQuestionIndex(0);
                      setShowAnswer(false);
                      setShowModuleQuizDialog(true);
                    }}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Take Module Quiz
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <CreateModuleDialog 
          open={createDialogOpen} 
          onOpenChange={setCreateDialogOpen}
          onModuleCreated={loadModules}
        />

        <Dialog open={showModuleQuizDialog} onOpenChange={setShowModuleQuizDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedModule?.title} - Module Quiz</DialogTitle>
              <DialogDescription>
                Test your knowledge of all materials in this module
              </DialogDescription>
            </DialogHeader>
            {!quizSubmitted ? (
              <div className="space-y-6">
                {selectedModule && (() => {
                  const allQuestions = getAllQuestions(selectedModule);
                  if (allQuestions.length === 0) return <p>No questions available</p>;
                  
                  const currentQuestion = allQuestions[currentQuestionIndex];
                  const selectedAnswer = quizAnswers[currentQuestionIndex];
                  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

                  return (
                    <>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Question {currentQuestionIndex + 1} of {allQuestions.length}</span>
                        <span>From: {currentQuestion.materialTitle}</span>
                      </div>
                      <div className="space-y-6">
                        <p className="text-lg font-medium">{currentQuestion.question}</p>
                        <div className="grid grid-cols-1 gap-3">
                          {currentQuestion.options.map((option, oIndex) => (
                            <Button
                              key={oIndex}
                              variant={
                                showAnswer
                                  ? oIndex === currentQuestion.correctAnswer
                                    ? "default"
                                    : selectedAnswer === oIndex
                                    ? "destructive"
                                    : "outline"
                                  : selectedAnswer === oIndex
                                  ? "default"
                                  : "outline"
                              }
                              className={cn(
                                "justify-start py-6 px-4 h-auto text-base",
                                showAnswer && oIndex === currentQuestion.correctAnswer && "bg-green-500 hover:bg-green-500 text-white",
                                showAnswer && selectedAnswer === oIndex && oIndex !== currentQuestion.correctAnswer && "bg-red-500 hover:bg-red-500 text-white"
                              )}
                              onClick={() => handleAnswerSelect(oIndex)}
                              disabled={showAnswer}
                            >
                              {option}
                            </Button>
                          ))}
                        </div>
                        {showAnswer && (
                          <div className={cn(
                            "p-4 rounded-lg",
                            isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          )}>
                            <p className="font-medium">
                              {isCorrect ? "Correct! ✓" : "Incorrect ✗"}
                            </p>
                            <p className="text-sm mt-1">
                              {isCorrect 
                                ? "Great job! Click Next to continue."
                                : `The correct answer was: ${currentQuestion.options[currentQuestion.correctAnswer]}`
                              }
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-4">
                        <Button
                          variant="outline"
                          onClick={handlePreviousQuestion}
                          disabled={currentQuestionIndex === 0}
                        >
                          Previous
                        </Button>
                        {!showAnswer ? (
                          <span className="text-sm text-gray-500">
                            Select an answer
                          </span>
                        ) : (
                          <Button
                            onClick={handleNextQuestion}
                          >
                            {currentQuestionIndex === allQuestions.length - 1 ? "Finish Quiz" : "Next"}
                          </Button>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="py-8">
                  <p className="text-2xl font-semibold mb-2">
                    Quiz Complete!
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    Score: {calculateScore(
                      quizAnswers,
                      selectedModule ? getAllQuestions(selectedModule) : []
                    ).toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setQuizAnswers([]);
                      setCurrentQuestionIndex(0);
                      setQuizSubmitted(false);
                    }}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowModuleQuizDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!moduleToDelete} onOpenChange={(open) => !open && setModuleToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Module</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{moduleToDelete?.title}"? This action cannot be undone.
                All materials, quizzes, and flashcards associated with this module will also be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setModuleToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteModule}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Dashboard;