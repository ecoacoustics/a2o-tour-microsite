/**
 *  Provides functionality for displaying species examples in a dialog.
 *  There are two parts:
 *  1. The `openSpeciesDialog` function for displaying species examples in a dialog.
 *     This accepts species data for the relevant species and updates the relevant elements of the
 *     dialog accordingly. These dom elements already exist on the page. 
 *     The function does not create the dialog or its contents.
 *  2. The `A2OTourSpeciesExample` custom element that triggers the dialog
 *     This custom element listens for context updates from the grid. When the button is 
 *     clicked, it calls the openSpeciesDialog function with the relevant species data.
 *     It's aware of all the species and receives a tag id from the grid context updates, and uses
 *     that to look up the corresponding species record.
 */



const GRID_TILE_CONTEXT = "oe-grid-tile-context";

/**
 * Populate and display the page-defined dialog for a selected species.
 * @param {string} dialogID ID of the dialog in the verification page.
 * @param {object} species Species data to display.
 */
function openSpeciesDialog(dialogID, species) {
  const dialog = dialogID ? document.getElementById(dialogID) : null;
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error(`Species example dialog was not found: ${dialogID}`);
  }

  const largeImage = dialog.querySelector("[data-species-dialog-image]");
  const title = dialog.querySelector("[data-species-dialog-title]");
  const description = dialog.querySelector("[data-species-dialog-description]");
  const examples = dialog.querySelector("[data-species-dialog-examples]");
  const exampleTemplate = dialog.querySelector("[data-species-example-template]");
  const closeButton = dialog.querySelector(".a2otour-species-dialog-close");

  closeButton.onclick = () => dialog.close();
  dialog.onclose = () => {
    if (!dialog.open) {
      examples.replaceChildren();
    }
  };
  dialog.onclick = (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  };

  title.textContent = species.name;
  description.textContent = species.description || "";
  description.hidden = !species.description;

  const imageURL = species.image_url;
  if (imageURL && largeImage.getAttribute("src") !== imageURL) {
    largeImage.setAttribute("src", imageURL);
  }

  examples.replaceChildren();
  species.examples.forEach(({ url, label }, index) => {
    const item = exampleTemplate.content.firstElementChild?.cloneNode(true);
    const exampleLabel = item.querySelector("[data-example-label]");
    const spectrogram = item.querySelector("oe-spectrogram");
    const controls = item.querySelector("oe-media-controls");
    exampleLabel.textContent = label ?? "";
    exampleLabel.hidden = label === null;
    const spectrogramID = `${dialog.id}-spectrogram-${index + 1}`;
    spectrogram.id = spectrogramID;
    spectrogram.setAttribute("src", url);
    controls.setAttribute("for", spectrogramID);
    examples.append(item);
  });

  if (!dialog.open) {
    dialog.showModal();
  }
}

class A2OTourSpeciesExample extends HTMLElement {
  // Elements inside this component's shadow root.
  #trigger; // Button that opens the examples dialog.
  #image; // Thumbnail image displayed inside the avatar.

  // Species records and current selection.
  #speciesData = []; // Species data.
  #currentSpeciesData; // Species record matching the grid's current tag ID.

  // Grid subscription cleanup.
  #unsubscribe; // Function that stops context updates when disconnected.

  /** Track grid context updates and select the species for the active tile.
   * This is an arrow function assigned to a field to ensure the correct `this` context when called by the grid.
  */
  #receiveTileContext = (tile, unsubscribe) => {
    if (unsubscribe && this.#unsubscribe !== unsubscribe) {
      this.#unsubscribe?.();
      this.#unsubscribe = unsubscribe;
    }

    this.#updateSpecies(tile?.model?.subject.actual_tag?.id);
  };

  /** Create the component shadow-DOM its presentation. */
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = `
      <style>
      :host {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        padding-inline-end: var(--space-small);
      }

      :host([hidden]) {
        display: none;
      }

      button {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        text-decoration: underline;
        text-align: start;
        white-space: nowrap;
        cursor: pointer;
      }

      button:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }

      .avatar {
        display: block;
        flex: 0 0 3.25rem;
        box-sizing: border-box;
        width: 3.25rem;
        height: 3.25rem;
        overflow: hidden;
        border: 2px solid transparent;
        border-radius: 50%;
      }

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scale(1.2);
      }

      button:hover .avatar,
      button:focus-visible .avatar,
      :host(:hover) .avatar,
      :host(:focus-within) .avatar {
        border-color: var(--color-white, #fff);
        box-shadow: 0 0 0 1px var(--color-white, #fff);
      }
      </style>
      <button type="button" aria-haspopup="dialog">
        <span class="avatar"><img alt=""></span>
        <span>Examples</span>
      </button>
    `;

    this.#trigger = shadowRoot.querySelector("button");
    this.#image = shadowRoot.querySelector("img");
    this.#trigger.addEventListener("click", () => this.#openDialog());
    this.hidden = true;
  }

  /** Called when the component is added to the DOM
   * Initializes the component by loading species data and subscribing to the verification grid context.
   */
   connectedCallback() {
     this.#loadSpeciesData();

    const request = new Event("context-request", {
      bubbles: true,
      composed: true,
    });
    Object.assign(request, {
      context: GRID_TILE_CONTEXT,
      contextTarget: this,
      callback: this.#receiveTileContext,
      subscribe: true,
    });
    this.dispatchEvent(request);
  }

  /** Called when the component is removed from the DOM to release the grid subscription. */
  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  /** Parse the species data payload. 
   *  This data is attached to the component via the `data-species-data-id` attribute.
   *  The payload should be a JSON array of species objects, each containing `tag_ids` and optionally `thumbnail_url` or `image_url`.
  */
  #loadSpeciesData() {
    const payloadID = this.dataset.speciesDataId;
    const payload = payloadID ? document.getElementById(payloadID) : null;

    if (!payload) {
      console.error("Species example data payload was not found.", payloadID);
      this.#speciesData = [];
      this.#setSpecies(null);
      return;
    }

    let speciesData;
    try {
      speciesData = JSON.parse(payload.textContent);
    } catch (error) {
      console.error("Failed to parse species example data payload.", error);
      this.#speciesData = [];
      this.#setSpecies(null);
      return;
    }

    if (!Array.isArray(speciesData)) {
      console.error("Species example data payload must be an array.", payloadID);
      this.#speciesData = [];
      this.#setSpecies(null);
      return;
    }

    this.#speciesData = speciesData.map((species) => {
      const examples = species.examples ?? [];
      if (!Array.isArray(examples)) {
        throw new TypeError(`Examples for "${species.name}" must be an array.`);
      }

      return {
        ...species,
        examples: examples.map((example, index) => {
          const url = typeof example === "string" ? example : example?.url;
          if (typeof url !== "string" || !url) {
            throw new TypeError(
              `Example ${index + 1} for "${species.name}" must have a URL.`,
            );
          }

          const label =
            example !== null && typeof example === "object"
              ? example.label ?? null
              : null;
          return { url, label };
        }),
      };
    });
  }

  /** Match the active tile's tag ID to a configured species. 
   * 
  */
  #updateSpecies(tagID) {
    if (tagID === null || tagID === undefined || tagID === "") {
      this.#setSpecies(null);
      return;
    }

    const numericTagID = Number(tagID);
    if (!Number.isInteger(numericTagID)) {
      this.#setSpecies(null);
      return;
    }

    const species = this.#speciesData.find((entry) =>
      Array.isArray(entry.tag_ids) &&
      entry.tag_ids.some((configuredTagID) => Number(configuredTagID) === numericTagID),
    );

    this.#setSpecies(species ?? null);
  }

  /** Update the trigger for the selected species, hiding it when unavailable. */
  #setSpecies(species) {
    this.#currentSpeciesData = species;
    const imageURL = species?.thumbnail_url;
    if (!imageURL) {
      this.#image.removeAttribute("src");
      this.#trigger.hidden = true;
      this.hidden = true;
      return;
    }

    this.#trigger.setAttribute(
      "aria-label",
      `Show examples for ${species.name || "species"}`,
    );
    if (this.#image.getAttribute("src") !== imageURL) {
      this.#image.setAttribute("src", imageURL);
    }
    this.#trigger.hidden = false;
    this.hidden = false;
  }

  /** Pass the selected species to the page-level dialog. */
  #openDialog() {
    if (!this.#currentSpeciesData) {
      return;
    }

    openSpeciesDialog(this.dataset.speciesDialogId, this.#currentSpeciesData);
  }
}

if (!customElements.get("a2otour-species-example")) {
  customElements.define("a2otour-species-example", A2OTourSpeciesExample);
}
