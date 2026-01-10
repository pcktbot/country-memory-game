<template>
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white p-6 shadow-md mb-6">
      <div class="max-w-7xl mx-auto flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-800">Country Memory Game</h1>
        <div class="flex gap-8">
          <div class="text-center">
            <div class="text-xs text-gray-500 uppercase tracking-wide">Score</div>
            <div class="text-2xl font-bold text-green-600">{{ score }}</div>
          </div>
          <div class="text-center">
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
            <div class="text-2xl font-bold text-gray-700">{{ totalAttempts }}</div>
          </div>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-6">
      <div class="bg-white rounded-lg shadow-md p-6">
        <div v-if="currentCountry" class="text-center py-6 px-4 bg-gray-50 rounded-lg mb-6 flex items-center justify-center gap-6">
          <h2 class="text-2xl text-gray-700">
            Find: <strong class="text-blue-600">{{ currentCountry.name }}</strong>
          </h2>
          <button @click="nextCountry" class="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 font-medium">
            Skip
          </button>
        </div>

        <div ref="mapContainer" class="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-white" style="height: 600px;">
          <div ref="mapWrapper" class="w-full h-full" />
        </div>

        <div v-if="feedback" class="mt-6 text-center">
          <div :class="[
            'inline-block px-8 py-4 rounded-lg text-lg font-medium animate-fadeIn',
            feedbackType === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          ]">
            {{ feedback }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Panzoom from '@panzoom/panzoom';
import { countries, getRandomCountry, findCountryByElement, type Country } from './countries';

const score = ref(0);
const totalAttempts = ref(0);
const currentCountry = ref<Country | null>(null);
const feedback = ref('');
const feedbackType = ref<'correct' | 'incorrect'>('correct');
const mapContainer = ref<HTMLDivElement | null>(null);
const mapWrapper = ref<HTMLDivElement | null>(null);

let panzoomInstance: any = null;
let svgElement: SVGElement | null = null;

onMounted(async () => {
  await loadMap();
  nextCountry();
});

onUnmounted(() => {
  if (panzoomInstance) {
    panzoomInstance.destroy();
  }
});

const loadMap = async () => {
  try {
    const response = await fetch('/world.svg');
    const svgText = await response.text();

    if (mapWrapper.value) {
      mapWrapper.value.innerHTML = svgText;
      svgElement = mapWrapper.value.querySelector('svg');

      if (svgElement) {
        // Make SVG responsive
        svgElement.style.width = '100%';
        svgElement.style.height = '100%';
        svgElement.style.cursor = 'grab';

        // Style all paths
        const paths = svgElement.querySelectorAll('path');
        paths.forEach(path => {
          path.style.fill = '#e0e0e0';
          path.style.stroke = '#ffffff';
          path.style.strokeWidth = '0.5';
          path.style.transition = 'fill 0.2s';
          path.style.cursor = 'pointer';

          path.addEventListener('mouseenter', () => {
            path.style.fill = '#bdbdbd';
          });

          path.addEventListener('mouseleave', () => {
            path.style.fill = '#e0e0e0';
          });

          path.addEventListener('click', handleCountryClick);
        });

        // Initialize panzoom
        panzoomInstance = Panzoom(svgElement, {
          maxScale: 5,
          minScale: 1,
          cursor: 'grab',
          canvas: true
        });

        // Enable mouse wheel zoom
        if (mapWrapper.value) {
          mapWrapper.value.addEventListener('wheel', (event: WheelEvent) => {
            if (panzoomInstance) {
              panzoomInstance.zoomWithWheel(event);
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to load map:', error);
  }
};

const handleCountryClick = (event: Event) => {
  event.stopPropagation();
  const target = event.target as SVGElement;

  const clickedCountry = findCountryByElement(target);

  if (!clickedCountry) {
    return;
  }

  totalAttempts.value++;

  if (clickedCountry.id === currentCountry.value?.id) {
    score.value++;
    feedback.value = `Correct! That's ${currentCountry.value.name}!`;
    feedbackType.value = 'correct';

    // Flash the country
    target.style.fill = '#4CAF50';
    setTimeout(() => {
      target.style.fill = '#e0e0e0';
      nextCountry();
    }, 1500);
  } else {
    feedback.value = `Try again! That's ${clickedCountry.name}.`;
    feedbackType.value = 'incorrect';

    // Flash incorrect country
    target.style.fill = '#f44336';
    setTimeout(() => {
      target.style.fill = '#e0e0e0';
      feedback.value = '';
    }, 1500);
  }
};

const nextCountry = () => {
  feedback.value = '';
  currentCountry.value = getRandomCountry();
};
</script>

<style>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}
</style>
