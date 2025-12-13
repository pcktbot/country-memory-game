<template>
  <div class="game-container">
    <header class="game-header">
      <h1>Country Memory Game</h1>
      <div class="score-board">
        <div class="score-item">
          <span class="label">Score:</span>
          <span class="value">{{ score }}</span>
        </div>
        <div class="score-item">
          <span class="label">Total:</span>
          <span class="value">{{ totalAttempts }}</span>
        </div>
      </div>
    </header>

    <div class="game-content">
      <div class="prompt-section" v-if="currentCountry">
        <h2>Find: <strong>{{ currentCountry }}</strong></h2>
        <button @click="nextCountry" class="skip-btn">Skip</button>
      </div>

      <div class="map-container">
        <svg
          ref="mapSvg"
          viewBox="0 0 1000 500"
          @click="handleMapClick"
          class="world-map"
        >
          <!-- Placeholder for world map SVG -->
          <text x="500" y="250" text-anchor="middle" fill="#999">
            World Map SVG to be loaded here
          </text>
        </svg>
      </div>

      <div class="feedback" v-if="feedback">
        <div :class="['feedback-message', feedbackType]">
          {{ feedback }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const score = ref(0);
const totalAttempts = ref(0);
const currentCountry = ref('');
const feedback = ref('');
const feedbackType = ref<'correct' | 'incorrect'>('correct');
const mapSvg = ref<SVGElement | null>(null);

const countries = [
  'United States',
  'Canada',
  'Mexico',
  'Brazil',
  'United Kingdom',
  'France',
  'Germany',
  'Spain',
  'Italy',
  'Russia',
  'China',
  'Japan',
  'India',
  'Australia',
  'South Africa'
];

onMounted(() => {
  nextCountry();
});

const nextCountry = () => {
  feedback.value = '';
  const randomIndex = Math.floor(Math.random() * countries.length);
  currentCountry.value = countries[randomIndex];
};

const handleMapClick = (event: MouseEvent) => {
  // TODO: Implement country detection from SVG click
  const target = event.target as SVGElement;

  // Placeholder logic
  const isCorrect = Math.random() > 0.5;
  totalAttempts.value++;

  if (isCorrect) {
    score.value++;
    feedback.value = `Correct! That's ${currentCountry.value}!`;
    feedbackType.value = 'correct';
    setTimeout(nextCountry, 1500);
  } else {
    feedback.value = `Try again!`;
    feedbackType.value = 'incorrect';
    setTimeout(() => {
      feedback.value = '';
    }, 1500);
  }
};
</script>

<style scoped>
.game-container {
  min-height: 100vh;
}

.game-header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.game-header h1 {
  font-size: 28px;
  color: #333;
}

.score-board {
  display: flex;
  gap: 30px;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.score-item .label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.score-item .value {
  font-size: 24px;
  font-weight: bold;
  color: #4CAF50;
}

.game-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.prompt-section {
  text-align: center;
  padding: 20px;
  margin-bottom: 20px;
  background: #f9f9f9;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.prompt-section h2 {
  font-size: 24px;
  color: #555;
}

.prompt-section strong {
  color: #2196F3;
}

.skip-btn {
  padding: 10px 20px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.skip-btn:hover {
  background: #f57c00;
}

.map-container {
  width: 100%;
  max-height: 600px;
  overflow: auto;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.world-map {
  width: 100%;
  height: auto;
  cursor: pointer;
}

.world-map path {
  fill: #ddd;
  stroke: #fff;
  stroke-width: 0.5;
  transition: fill 0.2s;
}

.world-map path:hover {
  fill: #bbb;
}

.feedback {
  margin-top: 20px;
  text-align: center;
}

.feedback-message {
  display: inline-block;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: 500;
  animation: slideIn 0.3s ease-out;
}

.feedback-message.correct {
  background: #4CAF50;
  color: white;
}

.feedback-message.incorrect {
  background: #f44336;
  color: white;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
