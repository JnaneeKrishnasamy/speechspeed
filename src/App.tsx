import React, { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, RotateCcw, TrendingUp, Clock, Volume2, Moon, Sun } from 'lucide-react'

interface SpeechResult {
  transcript: string
  wordCount: number
  duration: number
  wpm: number
  timestamp: Date
}

function App() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [duration, setDuration] = useState(0)
  const [wpm, setWpm] = useState(0)
  const [results, setResults] = useState<SpeechResult[]>([])
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : false
  })

  const recognitionRef = useRef<any>(null)
  const startTimeRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentTranscriptRef = useRef<string>('')

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  // Calculate WPM whenever transcript or duration changes
  useEffect(() => {
    if (isRecording && duration > 0 && transcript.trim()) {
      const words = transcript.trim().split(/\s+/).filter(word => word.length > 0)
      const currentWordCount = words.length
      const currentWpm = Math.round((currentWordCount / duration) * 60)
      
      setWordCount(currentWordCount)
      setWpm(currentWpm)
    }
  }, [transcript, duration, isRecording])

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      setError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      // Build complete transcript from all final results
      let completeTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          completeTranscript += event.results[i][0].transcript
        }
      }
      
      // Add interim results to the complete transcript
      const fullTranscript = completeTranscript + interimTranscript
      currentTranscriptRef.current = fullTranscript
      setTranscript(fullTranscript)
    }

    recognition.onerror = (event: any) => {
      setError(`Speech recognition error: ${event.error}`)
      setIsRecording(false)
    }

    recognition.onend = () => {
      if (isRecording) {
        // Restart recognition if it stops unexpectedly
        try {
          recognition.start()
        } catch (e) {
          console.log('Recognition restart failed:', e)
        }
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  const startRecording = () => {
    if (!isSupported) return

    setError('')
    setTranscript('')
    setWordCount(0)
    setDuration(0)
    setWpm(0)
    currentTranscriptRef.current = ''
    
    startTimeRef.current = Date.now()
    setIsRecording(true)
    
    try {
      recognitionRef.current?.start()
    } catch (e) {
      setError('Failed to start speech recognition. Please try again.')
      setIsRecording(false)
      return
    }
    
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      setDuration(elapsed)
    }, 100)
  }

  const stopRecording = () => {
    setIsRecording(false)
    recognitionRef.current?.stop()
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Calculate final stats
    const finalTranscript = currentTranscriptRef.current.trim()
    const finalWords = finalTranscript.split(/\s+/).filter(word => word.length > 0)
    const finalWordCount = finalWords.length
    const finalDuration = duration
    const finalWpm = finalDuration > 0 ? Math.round((finalWordCount / finalDuration) * 60) : 0

    // Save result if there's content
    if (finalTranscript && finalWordCount > 0) {
      const result: SpeechResult = {
        transcript: finalTranscript,
        wordCount: finalWordCount,
        duration: finalDuration,
        wpm: finalWpm,
        timestamp: new Date()
      }
      setResults(prev => [result, ...prev].slice(0, 10)) // Keep last 10 results
    }
  }

  const reset = () => {
    setTranscript('')
    setWordCount(0)
    setDuration(0)
    setWpm(0)
    setError('')
    currentTranscriptRef.current = ''
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getWpmColor = (wpm: number) => {
    if (wpm < 120) return 'text-red-500'
    if (wpm < 160) return 'text-yellow-500'
    if (wpm < 200) return 'text-green-500'
    return 'text-blue-500'
  }

  const getWpmLabel = (wpm: number) => {
    if (wpm < 120) return 'Slow'
    if (wpm < 160) return 'Normal'
    if (wpm < 200) return 'Fast'
    return 'Very Fast'
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md text-center transition-colors duration-300">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
            <MicOff className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 transition-colors duration-300">Not Supported</h2>
          <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-xl flex items-center justify-center transition-colors duration-300">
                <Volume2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Speaking Speed Analyzer</h1>
                <p className="text-gray-600 dark:text-gray-300 transition-colors duration-300">Measure and improve your speaking pace</p>
              </div>
            </div>
            
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 group"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-12 transition-transform duration-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Recording Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors duration-300">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center transition-colors duration-300">
                  <Clock className="w-6 h-6 text-gray-500 dark:text-gray-400 mx-auto mb-2 transition-colors duration-300" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">{formatTime(duration)}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">Duration</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center transition-colors duration-300">
                  <TrendingUp className="w-6 h-6 text-gray-500 dark:text-gray-400 mx-auto mb-2 transition-colors duration-300" />
                  <div className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">{wordCount}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">Words</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center transition-colors duration-300">
                  <Volume2 className="w-6 h-6 text-gray-500 dark:text-gray-400 mx-auto mb-2 transition-colors duration-300" />
                  <div className={`text-2xl font-bold ${getWpmColor(wpm)} transition-colors duration-300`}>{wpm}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 transition-colors duration-300">WPM</div>
                </div>
              </div>

              {/* WPM Indicator */}
              {wpm > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors duration-300">Speaking Speed</span>
                    <span className={`text-sm font-medium ${getWpmColor(wpm)} transition-colors duration-300`}>
                      {getWpmLabel(wpm)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 transition-colors duration-300">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        wpm < 120 ? 'bg-red-500' :
                        wpm < 160 ? 'bg-yellow-500' :
                        wpm < 200 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min((wpm / 250) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">
                    <span>0</span>
                    <span>125 (Slow)</span>
                    <span>160 (Normal)</span>
                    <span>200 (Fast)</span>
                    <span>250+ WPM</span>
                  </div>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex items-center justify-center gap-4 mb-8">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex items-center gap-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-3 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white px-8 py-4 rounded-xl font-medium transition-all duration-300 shadow-lg animate-pulse"
                  >
                    <MicOff className="w-5 h-5" />
                    Stop Recording
                  </button>
                )}
                
                <button
                  onClick={reset}
                  className="flex items-center gap-3 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white px-6 py-4 rounded-xl font-medium transition-all duration-300 hover:shadow-lg transform hover:scale-105"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 transition-colors duration-300">
                  <p className="text-red-700 dark:text-red-400 text-sm transition-colors duration-300">{error}</p>
                </div>
              )}

              {/* Live Transcript */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 min-h-[200px] transition-colors duration-300">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors duration-300">
                  {isRecording ? 'Live Transcript' : 'Transcript'}
                </h3>
                <div className="text-gray-700 dark:text-gray-300 leading-relaxed transition-colors duration-300">
                  {transcript || (
                    <span className="text-gray-400 dark:text-gray-500 italic transition-colors duration-300">
                      {isRecording ? 'Listening... Start speaking!' : 'Click "Start Recording" to begin'}
                    </span>
                  )}
                  {isRecording && <span className="animate-pulse">|</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Results History */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 transition-colors duration-300">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 transition-colors duration-300">Recent Results</h3>
              
              {results.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 transition-colors duration-300" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm transition-colors duration-300">No recordings yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-lg font-bold ${getWpmColor(result.wpm)} transition-colors duration-300`}>
                          {result.wpm} WPM
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2 transition-colors duration-300">
                        {result.wordCount} words • {formatTime(result.duration)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 transition-colors duration-300">
                        {result.transcript.substring(0, 100)}
                        {result.transcript.length > 100 && '...'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mt-6 transition-colors duration-300">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 transition-colors duration-300">Speaking Tips</h3>
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300 transition-colors duration-300">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Ideal Speed:</strong> 150-160 WPM for presentations</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Conversational:</strong> 120-150 WPM for casual talk</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Practice:</strong> Read aloud to improve consistency</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                  <p><strong>Clarity:</strong> Slower is better than unclear</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
