<template>
  <div id="app-wrapper" class="wrapper">
    <div ref="mapContainer" class="container">
      <div ref="mapWrapper" class="map-wrapper" />
    </div>

    <div id="scoreboard" class="scoreboard">
      <div v-if="gameCompleted" class="prompt prompt-complete">
        <h2 class="prompt-value">All countries completed!</h2>
        <p class="prompt-subtitle">Final score: {{ score }} / {{ totalAttempts }}</p>
      </div>
      <template v-else-if="currentCountry">
        <div class="prompt">
          <h2 class="prompt-value">{{ currentCountry.name }}</h2>
        </div>
        <div class="buttons">
          <button @click="nextCountry" class="button">
            Skip
          </button>
          <button @click="highlightCurrentCountry" class="button">
            Highlight
          </button>
        </div>
      </template>

      <div class="border">
        <div ref="scoreElement" class="score-section" id="score">
          <div class="score-title">Score</div>
          <div class="score-value">{{ score }}</div>
        </div>
        <div class="score-section">
          <div class="score-title">Total</div>
          <div class="score-value">{{ totalAttempts }}</div>
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
import { countries, findCountryByElement, type Country } from './countries';

const score = ref(0);
const totalAttempts = ref(0);
const currentCountry = ref<Country | null>(null);
const feedback = ref('');
const feedbackType = ref<'correct' | 'incorrect'>('correct');
const mapWrapper = ref<HTMLDivElement | null>(null);
const scoreElement = ref<HTMLDivElement | null>(null);
const gameCompleted = ref(false);
const foundCountries = ref<Set<string>>(new Set());
const usedCountryIds = ref<Set<string>>(new Set());

let panzoomInstance: any = null;
let svgElement: SVGElement | null = null;
const countryElements = new Map<string, SVGPathElement>();
let didDrag = false;
let pointerActive = false;
let dragStartX = 0;
let dragStartY = 0;
let scoreFlashTimeout: number | null = null;
let scoreIncorrectFlashTimeout: number | null = null;
let highlightTimeout: number | null = null;

onMounted(async () => {
  await loadMap();
  nextCountry();
});

onUnmounted(() => {
  if (panzoomInstance) {
    panzoomInstance.destroy();
  }
  if (scoreFlashTimeout !== null) {
    window.clearTimeout(scoreFlashTimeout);
  }
  if (scoreIncorrectFlashTimeout !== null) {
    window.clearTimeout(scoreIncorrectFlashTimeout);
  }
  if (highlightTimeout !== null) {
    window.clearTimeout(highlightTimeout);
  }
});

const escapeSelector = (value: string) => {
  if (typeof CSS !== 'undefined' && 'escape' in CSS) {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
};

const getCountryPaths = (country: Country): SVGPathElement[] => {
  if (!svgElement) {
    return [];
  }
  const id = escapeSelector(country.id);
  const name = escapeSelector(country.name);
  const selectors = [
    `path[id="${id}"]`,
    `path[data-country="${name}"]`,
    `path[data-country="${id}"]`
  ];
  return Array.from(svgElement.querySelectorAll(selectors.join(','))) as SVGPathElement[];
};

const setCountryFill = (country: Country, color: string) => {
  getCountryPaths(country).forEach(path => {
    path.style.fill = color;
  });
};

const flashScore = () => {
  const element = scoreElement.value;
  if (!element) {
    return;
  }
  element.classList.add('correct');
  if (scoreFlashTimeout !== null) {
    window.clearTimeout(scoreFlashTimeout);
  }
  scoreFlashTimeout = window.setTimeout(() => {
    element.classList.remove('correct');
    scoreFlashTimeout = null;
  }, 1000);
};

const flashScoreIncorrect = () => {
  const element = scoreElement.value;
  if (!element) {
    return;
  }
  element.classList.add('incorrect');
  if (scoreIncorrectFlashTimeout !== null) {
    window.clearTimeout(scoreIncorrectFlashTimeout);
  }
  scoreIncorrectFlashTimeout = window.setTimeout(() => {
    element.classList.remove('incorrect');
    scoreIncorrectFlashTimeout = null;
  }, 1000);
};

const highlightCurrentCountry = () => {
  if (!currentCountry.value) {
    return;
  }
  const country = currentCountry.value;
  setCountryFill(country, '#F19A3E');
  if (highlightTimeout !== null) {
    window.clearTimeout(highlightTimeout);
  }
  highlightTimeout = window.setTimeout(() => {
    const isFound = foundCountries.value.has(country.id);
    setCountryFill(country, isFound ? 'var(--found-country-fill)' : '#e0e0e0');
    highlightTimeout = null;
  }, 800);
};

const loadMap = async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}world.svg`);
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

          path.addEventListener('mouseenter', () => {
            const country = findCountryByElement(path);
            const isFound = country ? foundCountries.value.has(country.id) : false;
            if (country && !isFound) {
              setCountryFill(country, '#bdbdbd');
            }
          });

          path.addEventListener('mouseleave', () => {
            const country = findCountryByElement(path);
            const isFound = country ? foundCountries.value.has(country.id) : false;
            if (country) {
              setCountryFill(country, isFound ? 'var(--found-country-fill)' : '#e0e0e0');
            }
          });

          path.addEventListener('click', handleCountryClick);
        });

        // Track drag vs click (pointer events so we can reset even if pointer leaves the svg)
        const onPointerDown = (e: PointerEvent) => {
          pointerActive = true;
          didDrag = false;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
        };

        const onPointerMove = (e: PointerEvent) => {
          if (!pointerActive) {
            return;
          }
          const deltaX = Math.abs(e.clientX - dragStartX);
          const deltaY = Math.abs(e.clientY - dragStartY);
          if (deltaX > 5 || deltaY > 5) {
            didDrag = true;
          }
        };

        const onPointerUp = () => {
          pointerActive = false;
        };

        svgElement.addEventListener('pointerdown', onPointerDown);
        svgElement.addEventListener('pointermove', onPointerMove);
        svgElement.addEventListener('pointerup', onPointerUp);
        svgElement.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);

        // Prevent click events when dragging
        svgElement.addEventListener('click', (e: MouseEvent) => {
          if (didDrag) {
            e.stopPropagation();
            e.preventDefault();
            didDrag = false;
          }
        }, true);

        panzoomInstance = Panzoom(svgElement, {
          maxScale: 5,
          minScale: 1,
          cursor: 'grab',
          canvas: true,
          animate: true,
          duration: 300,
          easing: 'ease-in-out'
        });

        if (mapWrapper.value) {
          mapWrapper.value.addEventListener('wheel', (event: WheelEvent) => {
            if (panzoomInstance) {
              panzoomInstance.zoomWithWheel(event, {
                step: 0.1
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
  if (didDrag) {
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
    flashScore();
    feedback.value = `Correct! That's ${currentCountry.value.name}!`;
    feedbackType.value = 'correct';

    foundCountries.value.add(clickedCountry.id);

    setCountryFill(clickedCountry, '#85CB33');
    setTimeout(() => {
      setCountryFill(clickedCountry, 'var(--found-country-fill)');
    }, 300);
    setTimeout(() => {
      nextCountry();
    }, 1500);
  } else {
    flashScoreIncorrect();
    feedback.value = `Try again! That's ${clickedCountry.name}.`;
    feedbackType.value = 'incorrect';

    setCountryFill(clickedCountry, '#f44336');
    setTimeout(() => {
      const isFound = foundCountries.value.has(clickedCountry.id);
      setCountryFill(clickedCountry, isFound ? 'var(--found-country-fill)' : '#e0e0e0');
    }, 300);
    setTimeout(() => {
      feedback.value = '';
    }, 1500);
  }
};

const nextCountry = () => {
  feedback.value = '';
  const remaining = countries.filter(country => !foundCountries.value.has(country.id));
  if (remaining.length === 0) {
    gameCompleted.value = true;
    currentCountry.value = null;
    return;
  }
  let available = remaining.filter(country => !usedCountryIds.value.has(country.id));
  if (available.length === 0) {
    usedCountryIds.value = new Set();
    available = remaining;
  }
  const next = available[Math.floor(Math.random() * available.length)];
  currentCountry.value = next;
  usedCountryIds.value.add(next.id);
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
