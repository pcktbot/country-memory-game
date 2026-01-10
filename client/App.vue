<template>
  <div id="app-wrapper" class="wrapper">
    <div ref="mapContainer" class="container">
      <div ref="mapWrapper" class="map-wrapper" />
    </div>

    <div id="scoreboard" class="scoreboard">
      <div class="">
        <div v-if="currentCountry" class="">
          <h2 class="">{{ currentCountry.name }}</h2>
          <button @click="nextCountry" class="button">
            Skip
          </button>
        </div>

        <div class="border">
          <div class="">
            <div class="">Score</div>
            <div class="">{{ score }}</div>
          </div>
          <div class="">
            <div class="">Total</div>
            <div class="">{{ totalAttempts }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating feedback message -->
    <div v-if="feedback" class="feedback">
      <div :class="[
        'px-8 py-4 rounded-lg text-lg font-medium shadow-lg animate-fadeIn',
        feedbackType === 'correct' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
      ]">
        {{ feedback }}
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
const foundCountries = ref<Set<string>>(new Set());

let panzoomInstance: any = null;
let svgElement: SVGElement | null = null;
const countryElements = new Map<string, SVGPathElement>();
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

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
        const viewBox = svgElement.getAttribute('viewBox');
        const [, , vbWidth, vbHeight] = viewBox ? viewBox.split(' ').map(Number) : [0, 0, 2000, 1000];

        const aspectRatio = vbWidth / vbHeight;
        const viewportAspect = window.innerWidth / window.innerHeight;

        let width, height;
        if (aspectRatio > viewportAspect) {
          height = window.innerHeight;
          width = height * aspectRatio;
        } else {
          width = window.innerWidth;
          height = width / aspectRatio;
        }

        svgElement.style.width = `${width}px`;
        svgElement.style.height = `${height}px`;
        svgElement.style.cursor = 'grab';
        svgElement.style.display = 'block';

        const paths = svgElement.querySelectorAll('path');
        paths.forEach(path => {
          const id = path.getAttribute('id');
          const name = path.getAttribute('data-country');
          const identifier = name || id;

          if (identifier) {
            countryElements.set(identifier, path as SVGPathElement);
          }

          path.style.fill = '#e0e0e0';
          path.style.stroke = '#ffffff';
          path.style.strokeWidth = '0.5';
          path.style.transition = 'fill 0.2s';
          path.style.cursor = 'pointer';

          path.addEventListener('mouseenter', (e: Event) => {
            const isFound = identifier && foundCountries.value.has(identifier);
            console.log({ isFound, target: e.target.dataset.country });
            if (!isFound) {
              path.style.fill = '#bdbdbd';
            }
          });

          path.addEventListener('mouseleave', () => {
            const isFound = identifier && foundCountries.value.has(identifier);
            if (isFound) {
              path.style.fill = '#9e9e9e';
            } else {
              path.style.fill = '#e0e0e0';
            }
          });

          path.addEventListener('click', handleCountryClick);
        });

        // Track drag vs click
        svgElement.addEventListener('mousedown', (e: MouseEvent) => {
          isDragging = false;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
        });

        svgElement.addEventListener('mousemove', (e: MouseEvent) => {
          if (e.buttons === 1) {
            const deltaX = Math.abs(e.clientX - dragStartX);
            const deltaY = Math.abs(e.clientY - dragStartY);
            if (deltaX > 5 || deltaY > 5) {
              isDragging = true;
            }
          }
        });

        // Prevent click events when dragging
        svgElement.addEventListener('click', (e: MouseEvent) => {
          if (isDragging) {
            e.stopPropagation();
            e.preventDefault();
          }
        }, true); // Use capture phase to intercept before other handlers

        svgElement.addEventListener('mouseup', () => {
          setTimeout(() => {
            isDragging = false;
          }, 50); // Increased timeout to ensure click is blocked
        });

        // Initialize panzoom
        panzoomInstance = Panzoom(svgElement, {
          maxScale: 5,
          minScale: 1,
          cursor: 'grab',
          canvas: true,
          animate: true,
          duration: 300,
          easing: 'ease-in-out'
        });

        // Enable mouse wheel zoom with custom step
        if (mapWrapper.value) {
          mapWrapper.value.addEventListener('wheel', (event: WheelEvent) => {
            if (panzoomInstance) {
              panzoomInstance.zoomWithWheel(event, {
                step: 0.1  // Smaller step = slower zoom
              });
            }
          });
        }
      }
    }
    console.log(foundCountries.value);
  } catch (error) {
    console.error('Failed to load map:', error);
  }
};

const handleCountryClick = (event: Event) => {
  // Ignore clicks that were actually drags
  if (isDragging) {
    return;
  }

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

    // Mark as found
    foundCountries.value.add(clickedCountry.id);

    // Flash the country green
    target.style.fill = '#4CAF50';
    setTimeout(() => {
      // Set to darker gray for found countries
      target.style.fill = '#9e9e9e';
      nextCountry();
    }, 1500);
  } else {
    feedback.value = `Try again! That's ${clickedCountry.name}.`;
    feedbackType.value = 'incorrect';

    // Flash incorrect country red
    target.style.fill = '#f44336';
    setTimeout(() => {
      // Return to normal color (or darker if already found)
      const isFound = foundCountries.value.has(clickedCountry.id);
      target.style.fill = isFound ? '#9e9e9e' : '#e0e0e0';
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
