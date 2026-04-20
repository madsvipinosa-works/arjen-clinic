'use client';

import { useState, useEffect } from 'react';
import { format } from "date-fns";
import { Send, MessageSquare, ShieldCheck, Clock, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PublicConsultationPage() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [threadId, setThreadId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Simple authentication check using localStorage
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userData = JSON.parse(userStr);
          setUser(userData);
          // Simulate loading messages (in real app, this would fetch from API)
          setMessages([
            {
              id: 1,
              content: "Welcome to Arjen Clinic consultation! How can we help you today?",
              sender_role: 'staff',
              created_at: new Date().toISOString()
            }
          ]);
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Simulate message sending (in real app, this would call API)
      const newMsg = {
        id: Date.now(),
        patient_id: user.id,
        sender_id: user.id,
        sender_role: 'patient',
        content: newMessage.trim(),
        thread_id: threadId || 'default',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
      
      // Simulate staff response after 2 seconds
      setTimeout(() => {
        const staffResponse = {
          id: Date.now() + 1,
          patient_id: user.id,
          sender_id: 'staff',
          sender_role: 'staff',
          content: "Thank you for your message. Our medical team will review your query and respond within 2-4 hours during clinic hours.",
          thread_id: threadId || 'default',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, staffResponse]);
      }, 2000);
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-rose-500 rounded-2xl shadow-lg shadow-rose-200">
            <MessageSquare className="w-8 h-8 text-white animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent animate-spin"></div>
            <span className="font-medium">Loading consultation...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-gray-900">Authentication Required</CardTitle>
            <CardDescription>
              Please sign in to access the consultation service
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div>
                    <h4 className="font-semibold text-amber-800">Sign In Required</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      You need to be logged in to access the consultation service. Please sign in or create an account to continue.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => window.location.href = '/auth/login'}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => window.location.href = '/auth/register'}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-semibold"
                >
                  Create Account
                </Button>
              </div>

              <div className="text-center">
                <button 
                  onClick={() => window.location.href = '/'}
                  className="text-rose-600 hover:text-rose-700 text-sm font-medium underline"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Online Consultation</h1>
                <p className="text-sm text-gray-500">Private & Secure Medical Consultation</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Status</p>
                <p className="text-sm font-semibold text-green-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Online
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/patient/history'}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  History
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/patient/appointments'}
                  className="border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('user');
                    window.location.href = '/';
                  }}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col h-[calc(100vh-80px)]">
        <div className="flex-1 bg-white">
          {/* Messages Area */}
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-10">
                  <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6">
                    <MessageSquare className="w-10 h-10 text-rose-300" />
                  </div>
                  <div className="text-center space-y-4 max-w-md">
                    <h3 className="text-xl font-bold text-gray-900">Start Your Consultation</h3>
                    <p className="text-gray-600 font-medium">
                      Send your health questions or concerns to our medical team. We'll respond promptly with professional advice.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
                      <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="w-6 h-6 text-blue-600" />
                        <h4 className="font-semibold text-blue-900">What You Can Ask:</h4>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>Prenatal care questions and monitoring</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>Symptom concerns and health advice</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>Medication and treatment inquiries</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>Lab result interpretations</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                          <span>Follow-up care instructions</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, index) => {
                    const isMe = msg.sender_role === 'patient';
                    const showDate = index === 0 || messages[index - 1]?.created_at.getDate() !== msg.created_at.getDate();
                    
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className={`max-w-[80%] flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black shadow-sm ${
                            isMe ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400 border border-gray-100'
                          }`}>
                            {isMe ? 'ME' : 'DR'}
                          </div>
                          
                          {/* Message Bubble */}
                          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed max-w-md ${
                              isMe 
                                ? 'bg-rose-500 text-white rounded-br-none' 
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                            }`}>
                              {msg.content}
                            </div>
                            
                            {/* Timestamp */}
                            <span className="text-[10px] font-bold text-gray-300 mt-1.5 uppercase tracking-widest">
                              {format(new Date(msg.created_at), "h:mm a")}
                            </span>
                            
                            {showDate && (
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {format(new Date(msg.created_at), "MMM d, yyyy")}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4">
              {error && (
                <Alert className="mb-4 border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={sendMessage} className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your medical question or concern..."
                    required
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:bg-white transition-all resize-none font-medium"
                    disabled={isSubmitting}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !newMessage.trim()}
                  className="w-12 h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-md shadow-rose-200 flex-shrink-0 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>
              
              <div className="mt-4 text-center">
                <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                  Response Time: Typically within 2-4 hours during clinic hours
                </p>
                <p className="text-[10px] text-gray-400 font-medium mt-1">
                  For emergencies, please call: +63 912 3456 7890
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
