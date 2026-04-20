import { generateSummary, generateFlashcards, generateQuiz } from './api.js';

// --- UI Elements ---
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const notesInput = document.getElementById('notes-input');

const btnGenerateSummary = document.getElementById('btn-generate-summary');
const btnGenerateFlashcards = document.getElementById('btn-generate-flashcards');
const btnGenerateQuiz = document.getElementById('btn-generate-quiz');

const summaryContent = document.getElementById('summary-content');
const flashcardsContainer = document.getElementById('flashcards-container');
const quizContainer = document.getElementById('quiz-container');

// State flags
let hasSummary = false;
let hasFlashcards = false;
let hasQuiz = false;

// --- Navigation Logic ---
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    
    // Update Active Button
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // Update View
    const targetId = btn.getAttribute('data-target');
    switchView(targetId);
  });
});

function switchView(targetId) {
  views.forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(targetId).classList.add('active');
}

function showLoading(text) {
  document.getElementById('loading-text').innerText = text;
  switchView('loading-view');
}

// --- Action Logic ---

btnGenerateSummary.addEventListener('click', async () => {
  const text = notesInput.value.trim();
  if (!text) return alert('Please paste some notes first!');
  
  showLoading('Generating Summary...');
  try {
    const summaryText = await generateSummary(text);
    
    // Parse markdown (Requires marked.js loaded in HTML)
    if (typeof marked !== 'undefined') {
      summaryContent.innerHTML = marked.parse(summaryText);
    } else {
      summaryContent.innerText = summaryText; // Fallback
    }

    hasSummary = true;
    document.getElementById('nav-summary').disabled = false;
    
    // Switch to summary view
    document.querySelector('[data-target="summary-view"]').click();
  } catch (error) {
    alert("Error generating summary: " + error.message);
    switchView('dashboard-view');
  }
});

btnGenerateFlashcards.addEventListener('click', async () => {
  const text = notesInput.value.trim();
  if (!text) return alert('Please paste some notes first!');
  
  showLoading('Creating Flashcards...');
  try {
    const flashcardsData = await generateFlashcards(text);
    
    // Render Flashcards
    flashcardsContainer.innerHTML = '';
    flashcardsData.forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className = 'flashcard';
      cardEl.innerHTML = `
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <h3>${card.front}</h3>
          </div>
          <div class="flashcard-back">
            <p>${card.back}</p>
          </div>
        </div>
      `;
      // Toggle flip on click
      cardEl.addEventListener('click', () => {
        cardEl.classList.toggle('flipped');
      });
      flashcardsContainer.appendChild(cardEl);
    });

    hasFlashcards = true;
    document.getElementById('nav-flashcards').disabled = false;
    
    // Switch to flashcards
    document.querySelector('[data-target="flashcards-view"]').click();
  } catch (error) {
    alert("Error generating flashcards: " + error.message);
    switchView('dashboard-view');
  }
});

btnGenerateQuiz.addEventListener('click', async () => {
  const text = notesInput.value.trim();
  if (!text) return alert('Please paste some notes first!');
  
  showLoading('Building Quiz...');
  try {
    const quizData = await generateQuiz(text);
    
    // Render Quiz
    quizContainer.innerHTML = '';
    
    quizData.forEach((item, qIndex) => {
      const qGroup = document.createElement('div');
      qGroup.className = 'quiz-card';
      
      const qText = document.createElement('div');
      qText.className = 'question-text';
      qText.innerText = \`Q\${qIndex + 1}. \${item.question}\`;
      qGroup.appendChild(qText);
      
      const optionsGrid = document.createElement('div');
      optionsGrid.className = 'options-grid';
      
      const feedbackEl = document.createElement('div');
      feedbackEl.className = 'quiz-feedback';
      
      let answered = false;

      item.options.forEach((optText, optIndex) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = optText;
        
        btn.addEventListener('click', () => {
          if (answered) return; // Only allow one selection per question
          answered = true;
          
          if (optIndex === item.correctAnswer) {
            btn.classList.add('correct');
            feedbackEl.innerText = '✅ Correct! ' + item.explanation;
            feedbackEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            feedbackEl.style.border = '1px solid #10B981';
          } else {
            btn.classList.add('incorrect');
            // Highlight the correct one
            optionsGrid.children[item.correctAnswer].classList.add('correct');
            feedbackEl.innerText = '❌ Incorrect. ' + item.explanation;
            feedbackEl.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            feedbackEl.style.border = '1px solid #EF4444';
          }
          feedbackEl.style.display = 'block';
        });
        
        optionsGrid.appendChild(btn);
      });
      
      qGroup.appendChild(optionsGrid);
      qGroup.appendChild(feedbackEl);
      quizContainer.appendChild(qGroup);
    });

    hasQuiz = true;
    document.getElementById('nav-quiz').disabled = false;
    
    // Switch to quiz
    document.querySelector('[data-target="quiz-view"]').click();
  } catch (error) {
    alert("Error generating quiz: " + error.message);
    switchView('dashboard-view');
  }
});
