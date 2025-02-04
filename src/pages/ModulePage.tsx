import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Book, Clock, FileText, ArrowLeft, Brain, ScrollText, HelpCircle, Layers, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { uploadFile, getFileUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { fetchModule, createMaterial, updateMaterial, deleteMaterial } from "@/lib/api";

interface Material {
  id: string;
  title: string;
  date: string;
  type: string;
  moduleId: string;
  file_path?: string;
  file_url?: string;
  summary?: {
    mainPoints: string[];
    topics: string[];
    keyTerms: string[];
  };
  quiz?: {
    question: string;
    options: string[];
    correctAnswer: number;
  }[];
  flashcards?: {
    front: string;
    back: string;
  }[];
}

interface Module {
  id: string;
  title: string;
  description: string;
  materials: Material[];
}

interface FlashcardResult {
  cardIndex: number;
  isCorrect: boolean;
}

const ModulePage = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showModuleQuizDialog, setShowModuleQuizDialog] = useState(false);
  const [showModuleSummaryDialog, setShowModuleSummaryDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showFlashcardsDialog, setShowFlashcardsDialog] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardResults, setFlashcardResults] = useState<FlashcardResult[]>([]);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);
  const [flashcardsCompleted, setFlashcardsCompleted] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewCards, setReviewCards] = useState<number[]>([]);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  useEffect(() => {
    loadModule();
  }, [moduleId, user]);

  const loadModule = async () => {
    try {
      const moduleData = await fetchModule(moduleId!);
      setModule(moduleData);
    } catch (error) {
      console.error('Error fetching module:', error);
      toast({
        title: "Error",
        description: "Failed to load module. Please try again.",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploading(true);
      toast({
        title: "Processing...",
        description: "Uploading and analyzing your material...",
      });

      try {
        // Upload file to Supabase Storage
        const fileData = await uploadFile(file, `modules/${moduleId}`);

        // Create material record through API
        await createMaterial({
          module_id: moduleId,
          title: file.name.replace(/\.[^/.]+$/, ""),
          type: file.name.split('.').pop()?.toUpperCase() || "PDF",
          file_path: fileData.path,
          file_url: fileData.url,
        });

        loadModule(); // Refresh the module data
        toast({
          title: "Success",
          description: "Material uploaded successfully",
        });
        event.target.value = ''; // Clear the file input
      } catch (error) {
        console.error('Error uploading material:', error);
        toast({
          title: "Error",
          description: "Failed to upload material. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const calculateScore = (answers: number[], questions: { correctAnswer: number }[]) => {
    if (!questions?.length) return 0;
    const correctAnswers = answers.reduce((acc, answer, index) => {
      return acc + (answer === questions[index].correctAnswer ? 1 : 0);
    }, 0);
    return (correctAnswers / questions.length) * 100;
  };

  const analyzeMaterial = async (material: Material) => {
    if (!material.file_url) {
      toast({
        title: "Error",
        description: "No file found to analyze",
        variant: "destructive",
      });
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: material.file_url,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze document');

      const analysis = await response.json();

      // Update material through API
      await updateMaterial(material.id, {
        summary: analysis.summary,
        quiz: analysis.quiz,
        flashcards: analysis.flashcards
      });

      // Refresh module data
      await loadModule();

      toast({
        title: "Success",
        description: "Material analyzed successfully",
      });
    } catch (error) {
      console.error('Error analyzing material:', error);
      toast({
        title: "Error",
        description: "Failed to analyze material. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getAllQuestions = (material: Material) => {
    return material.quiz?.map((question, index) => ({
      ...question,
      questionIndex: index
    })) || [];
  };

  const handleAnswerSelect = (oIndex: number) => {
    if (showAnswer) return; // Prevent changing answer after showing feedback
    const newAnswers = [...quizAnswers];
    newAnswers[currentQuestionIndex] = oIndex;
    setQuizAnswers(newAnswers);
    setShowAnswer(true);
  };

  const handleNextQuestion = () => {
    const allQuestions = selectedMaterial ? getAllQuestions(selectedMaterial) : [];
    setShowAnswer(false);
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setQuizSubmitted(true);
      const score = calculateScore(quizAnswers, selectedMaterial?.quiz || []);
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

  const handleFlashcardAssessment = (isCorrect: boolean) => {
    setFlashcardResults(prev => [...prev, { cardIndex: currentFlashcardIndex, isCorrect }]);
    setShowFlashcardAnswer(false);
    setIsFlipped(false);

    // If in review mode, remove the card from review if correct
    if (isReviewMode && isCorrect) {
      setReviewCards(prev => prev.filter(i => i !== currentFlashcardIndex));
    }

    // Move to next card
    if (isReviewMode) {
      if (reviewCards.length > 1) {
        const currentIdx = reviewCards.indexOf(currentFlashcardIndex);
        const nextIdx = reviewCards[(currentIdx + 1) % reviewCards.length];
        setCurrentFlashcardIndex(nextIdx);
      } else {
        setFlashcardsCompleted(true);
      }
    } else {
      const totalCards = selectedMaterial?.flashcards?.length || 0;
      if (currentFlashcardIndex < totalCards - 1) {
        setCurrentFlashcardIndex(prev => prev + 1);
      } else {
        setFlashcardsCompleted(true);
      }
    }
  };

  const startReview = () => {
    const incorrectCards = flashcardResults
      .filter(result => !result.isCorrect)
      .map(result => result.cardIndex);
    setReviewCards([...new Set(incorrectCards)]);
    setCurrentFlashcardIndex(incorrectCards[0]);
    setIsReviewMode(true);
    setFlashcardsCompleted(false);
    setFlashcardResults([]);
    setIsFlipped(false);
    setShowFlashcardAnswer(false);
  };

  const resetFlashcards = () => {
    setCurrentFlashcardIndex(0);
    setFlashcardResults([]);
    setIsFlipped(false);
    setShowFlashcardAnswer(false);
    setFlashcardsCompleted(false);
    setIsReviewMode(false);
    setReviewCards([]);
  };

  const handleDeleteMaterial = async () => {
    if (!materialToDelete) return;

    try {
      await deleteMaterial(materialToDelete.id);
      toast({
        title: "Success",
        description: "Material deleted successfully",
      });
      loadModule();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast({
        title: "Error",
        description: "Failed to delete material. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMaterialToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading module...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Module not found</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">{module.title}</h1>
              <p className="text-gray-500">{module.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowModuleSummaryDialog(true)}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Module Summary
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowModuleQuizDialog(true)}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                Module Quiz
              </Button>
            </div>
          </div>
        </div>

        {module.materials.length === 0 ? (
          <div className="mt-6">
            <div className="text-center py-12 border rounded-lg bg-white">
              <div className="max-w-md mx-auto space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">No materials yet</h2>
                  <p className="text-gray-500">Upload your first material to get started with summaries, quizzes, and flashcards</p>
                </div>
                <Button variant="outline" className="w-full flex items-center gap-2 justify-center py-8 border-dashed">
                  <label htmlFor="file-upload-empty" className="cursor-pointer flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Material
                  </label>
                  <Input
                    type="file"
                    id="file-upload-empty"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.ppt,.pptx,.doc,.docx"
                  />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            {module.materials.map((material) => (
              <div
                key={material.id}
                className="flex items-center justify-between p-4 border rounded-lg mb-2 hover:bg-gray-50 transition-colors relative group"
              >
                <div className="flex items-center gap-4">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{material.title}</p>
                    <p className="text-sm text-gray-500">{material.type} • {new Date(material.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setMaterialToDelete(material)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMaterial(material);
                      setShowSummaryDialog(true);
                    }}
                    disabled={!material.summary}
                  >
                    <ScrollText className="h-4 w-4 mr-2" />
                    Summary
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMaterial(material);
                      setQuizAnswers(new Array(material.quiz?.length || 0).fill(-1));
                      setQuizSubmitted(false);
                      setCurrentQuestionIndex(0);
                      setShowAnswer(false);
                      setShowQuizDialog(true);
                    }}
                    disabled={!material.quiz}
                  >
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Quiz
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedMaterial(material);
                      setCurrentFlashcardIndex(0);
                      setIsFlipped(false);
                      setShowFlashcardsDialog(true);
                    }}
                    disabled={!material.flashcards}
                  >
                    <Layers className="h-4 w-4 mr-2" />
                    Flashcards
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeMaterial(material)}
                    disabled={analyzing || !material.file_url}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {analyzing ? "Analyzing..." : "Analyze"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (material.file_url) {
                        window.open(material.file_url, '_blank');
                      } else {
                        toast({
                          title: "Error",
                          description: "File not found",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
              </div>
            ))}
            <div className="mt-4">
              <Button variant="outline" className="w-full flex items-center gap-2 justify-center">
                <label htmlFor="file-upload" className="cursor-pointer flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload New Material
                </label>
                <Input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.ppt,.pptx,.doc,.docx"
                />
              </Button>
            </div>
          </div>
        )}

        <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedMaterial?.title} - Summary</DialogTitle>
              <DialogDescription>
                Key points and topics from your material
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Main Points</h3>
                <ul className="list-disc pl-6 space-y-2">
                  {selectedMaterial?.summary?.mainPoints.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Topics Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMaterial?.summary?.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Key Terms</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedMaterial?.summary?.keyTerms.map((term, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedMaterial?.title} - Quiz</DialogTitle>
              <DialogDescription>
                Test your knowledge of this material
              </DialogDescription>
            </DialogHeader>
            {!quizSubmitted ? (
              <div className="space-y-6">
                {selectedMaterial && (() => {
                  const allQuestions = getAllQuestions(selectedMaterial);
                  if (allQuestions.length === 0) return <p>No questions available</p>;
                  
                  const currentQuestion = allQuestions[currentQuestionIndex];
                  const selectedAnswer = quizAnswers[currentQuestionIndex];
                  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

                  return (
                    <>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Question {currentQuestionIndex + 1} of {allQuestions.length}</span>
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
                        <span className="text-sm text-gray-500">
                          {!showAnswer ? "Select an answer" : "Click Next to continue"}
                        </span>
                        {showAnswer && (
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
                      selectedMaterial?.quiz || []
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
                      setShowAnswer(false);
                    }}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowQuizDialog(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showModuleQuizDialog} onOpenChange={setShowModuleQuizDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{module.title} - Module Quiz</DialogTitle>
              <DialogDescription>
                Test your knowledge of all materials in this module
              </DialogDescription>
            </DialogHeader>
            {!quizSubmitted ? (
              <div className="space-y-6">
                {(() => {
                  const allQuestions = module.materials.flatMap((material, mIndex) => 
                    (material.quiz || []).map((question, qIndex) => ({
                      ...question,
                      materialTitle: material.title,
                      materialIndex: mIndex,
                      questionIndex: qIndex
                    }))
                  );
                  
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
                      module.materials.flatMap(m => m.quiz || [])
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
                      setShowAnswer(false);
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

        <Dialog open={showModuleSummaryDialog} onOpenChange={setShowModuleSummaryDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{module.title} - Module Summary</DialogTitle>
              <DialogDescription>
                Comprehensive summary of all materials in this module
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8">
              {module.materials.map((material) => (
                <div key={material.id} className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">{material.title}</h3>
                  <div className="space-y-6 pl-4">
                    <div>
                      <h4 className="font-medium mb-2">Main Points</h4>
                      <ul className="list-disc pl-6 space-y-2">
                        {material.summary?.mainPoints.map((point, index) => (
                          <li key={index} className="text-gray-600">{point}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Topics Covered</h4>
                      <div className="flex flex-wrap gap-2">
                        {material.summary?.topics.map((topic, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Key Terms</h4>
                      <div className="flex flex-wrap gap-2">
                        {material.summary?.keyTerms.map((term, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showFlashcardsDialog} onOpenChange={setShowFlashcardsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedMaterial?.title} - {isReviewMode ? "Review" : "Flashcards"}
              </DialogTitle>
              <DialogDescription>
                {isReviewMode 
                  ? "Review the cards you found challenging"
                  : "Test your knowledge with flashcards"}
              </DialogDescription>
            </DialogHeader>
            {selectedMaterial?.flashcards && selectedMaterial.flashcards.length > 0 && !flashcardsCompleted && (
              <div className="space-y-6">
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>
                    {isReviewMode 
                      ? `Review Card ${reviewCards.indexOf(currentFlashcardIndex) + 1} of ${reviewCards.length}`
                      : `Card ${currentFlashcardIndex + 1} of ${selectedMaterial.flashcards.length}`
                    }
                  </span>
                  <span className="text-primary font-medium">
                    {flashcardResults.filter(r => r.isCorrect).length} correct of {flashcardResults.length} attempted
                  </span>
                </div>
                <div
                  className="relative w-full aspect-[3/2] cursor-pointer"
                  onClick={() => {
                    setIsFlipped(!isFlipped);
                    if (!isFlipped) {
                      setShowFlashcardAnswer(true);
                    }
                  }}
                >
                  <div
                    className={cn(
                      "absolute inset-0 transition-all duration-500 [transform-style:preserve-3d]",
                      isFlipped ? "[transform:rotateY(180deg)]" : ""
                    )}
                  >
                    {/* Front of card */}
                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-white rounded-xl shadow-lg [backface-visibility:hidden]">
                      <p className="text-lg font-medium text-center">
                        {selectedMaterial.flashcards[currentFlashcardIndex].front}
                      </p>
                    </div>
                    {/* Back of card */}
                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-white rounded-xl shadow-lg [transform:rotateY(180deg)] [backface-visibility:hidden]">
                      <p className="text-lg font-medium text-center">
                        {selectedMaterial.flashcards[currentFlashcardIndex].back}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {showFlashcardAnswer && (
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        className="w-32 bg-red-50 hover:bg-red-100 border-red-200"
                        onClick={() => handleFlashcardAssessment(false)}
                      >
                        Got it wrong
                      </Button>
                      <Button
                        variant="outline"
                        className="w-32 bg-green-50 hover:bg-green-100 border-green-200"
                        onClick={() => handleFlashcardAssessment(true)}
                      >
                        Got it right
                      </Button>
                    </div>
                  )}
                  {!showFlashcardAnswer && (
                    <p className="text-center text-sm text-gray-500">
                      Click the card to reveal the answer
                    </p>
                  )}
                </div>
              </div>
            )}
            {flashcardsCompleted && (
              <div className="space-y-6 py-4">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    {isReviewMode ? "Review Complete!" : "All Cards Completed!"}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You got {flashcardResults.filter(r => r.isCorrect).length} out of{" "}
                    {flashcardResults.length} cards correct
                    {!isReviewMode && flashcardResults.some(r => !r.isCorrect) && 
                      ` (${flashcardResults.filter(r => !r.isCorrect).length} cards to review)`}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {!isReviewMode && flashcardResults.some(r => !r.isCorrect) && (
                    <Button onClick={startReview} className="w-full">
                      Review Incorrect Cards
                    </Button>
                  )}
                  <Button onClick={resetFlashcards} variant="outline" className="w-full">
                    Start Over
                  </Button>
                  <Button 
                    onClick={() => setShowFlashcardsDialog(false)} 
                    variant="outline" 
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!materialToDelete} onOpenChange={(open) => !open && setMaterialToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Material</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{materialToDelete?.title}"? This action cannot be undone.
                All summaries, quizzes, and flashcards associated with this material will also be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setMaterialToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteMaterial}
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

export default ModulePage;