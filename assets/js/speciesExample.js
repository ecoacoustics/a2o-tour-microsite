/**
 * Component that displays a species example link which calls up a dialog with that species' details and examples.
 * 
 * The shadow DOM contains a clickable link with an avatar and label that opens the species dialog.
 * The dialog appended to `document.body` displays the species' full-size image, name, description, and example players.
 * The dialog is not part of the shadow DOM. This allows it to share styling with the rest of the document.
 * 
 * Component constructor initializes the shadow DOM and sets up the link and avatar elements.
 * 
 * connectedCallback runs when the component is added to the document's DOM. It is used to subscribe to the grid context and 
 * update the species selection. It specifies the receiveTileContext callback to handle context updates. receiveTileContext 
 * is called when the grid context updates. It receives the current tile and an unsubscribe function.
 * 
 * receiveTileContext calls updateSpecies which looks up the species record by tag ID and calls setSpecies to update the component's display.
 * data is passed to the component as follows:
 * - a script element with some ID on the document (outside the component) contains the species data in JSON format
 * - the component has a data attribute specifying that script element's ID, e.g., `data-species-data-id="species-data"`
 * - when initializing the data, the component accesses the script element by its ID and textContent and parses the JSON content to populate `#speciesData`
 * 
 * note: an alternative approach would have been for the component to dispatch a data request event when it connects, and have a javascript 
 * listener elsewhere in the document respond with the species data.
 * 
 * The shadow DOM contains the link and avatar, while the dialog is appended to the document body. A click event listener triggers the 
 * openDialog method to display the species dialog.
 * 
 * openDialog first creates (or reuses) the dialog dom element and all its child elements, 
 * then populates them with the current species' details and example spectrogram players.
 * 
 */



const GRID_TILE_CONTEXT = "oe-grid-tile-context";
let dialogSequence = 0;

class A2OTourSpeciesExample extends HTMLElement {
  // Elements inside this component's shadow root.
  #link; // Clickable element that opens the examples dialog.
  #avatar; // Circular frame that crops the thumbnail.
  #image; // Thumbnail image displayed inside the avatar.
  #label; // "Examples" text displayed beside the avatar.

  // Species records and current selection.
  #speciesData = []; // Species data.
  #species; // Species record matching the grid's current tag ID.

  // Dialog elements appended to document.body.
  #dialog; // Native modal dialog containing the species card.
  #largeImage; // Full-size species image shown in the dialog.
  #title; // Species name heading shown in the dialog.
  #description; // Species description shown in the dialog.
  #examples; // Container for the dialog's example players.

  // Grid subscription cleanup.
  #unsubscribe; // Function that stops context updates when disconnected.
  #dialogID = `a2otour-species-dialog-${++dialogSequence}`;

  /** Track grid context updates and select the species for the active tile.
   * This is an arrow function assigned to a field to ensure the correct `this` context when called by the grid.
  */
  #receiveTileContext = (tile, unsubscribe) => {
    if (unsubscribe && this.#unsubscribe !== unsubscribe) {
      this.#unsubscribe?.();
      this.#unsubscribe = unsubscribe;
    }

    this.#updateSpecies(tile?.model?.tag?.id);
  };

  /** Create the component shadow-DOM its presentation. */
  constructor() {
    super();

    const shadowRoot = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        padding-inline-end: var(--space-small);
      }

      :host([hidden]) {
        display: none;
      }

      a {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        color: inherit;
        text-decoration: underline;
        white-space: nowrap;
      }

      a:focus-visible {
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

      a:hover .avatar,
      a:focus-visible .avatar,
      :host(:hover) .avatar,
      :host(:focus-within) .avatar {
        border-color: var(--color-white, #fff);
        box-shadow: 0 0 0 1px var(--color-white, #fff);
      }
    `;

    this.#link = document.createElement("a");
    this.#link.href = `#${this.#dialogID}`;
    this.#link.setAttribute("role", "button");
    this.#link.setAttribute("aria-haspopup", "dialog");
    this.#link.addEventListener("click", (event) => {
      event.preventDefault();
      this.#openDialog();
    });
    this.#link.addEventListener("keydown", (event) => {
      if (event.key === " " && !event.repeat) {
        event.preventDefault();
        this.#link.click();
      }
    });

    this.#image = document.createElement("img");
    this.#image.alt = "";
    this.#avatar = document.createElement("span");
    this.#avatar.className = "avatar";
    this.#avatar.append(this.#image);
    this.#label = document.createElement("span");
    this.#label.textContent = "Examples";
    this.#link.append(this.#avatar, this.#label);
    shadowRoot.append(style, this.#link);
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

  /** Called when the component is removed from the DOM
   * Releases the grid subscription and removes the page-level dialog.
   */
  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#closeDialog();
    this.#dialog?.remove();
    this.#dialog = undefined;
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
    if (species !== this.#species && this.#dialog?.open) {
      this.#closeDialog();
    }

    this.#species = species;
    const imageURL = species?.thumbnail_url;
    if (!imageURL) {
      this.#image.removeAttribute("src");
      this.#link.hidden = true;
      this.hidden = true;
      return;
    }

    this.#link.setAttribute(
      "aria-label",
      `Show examples for ${species.name || "species"}`,
    );
    if (this.#image.getAttribute("src") !== imageURL) {
      this.#image.setAttribute("src", imageURL);
    }
    this.#link.hidden = false;
    this.hidden = false;
  }

  /** Create the dialog on demand, populate it, and display it. */
  #openDialog() {
    if (!this.#species) {
      return;
    }

    this.#ensureDialog();
    this.#renderDialog();
    this.#dialog.showModal();
  }

  /** Build the dialog structure once and attach it outside the grid's shadow DOM. */
  #ensureDialog() {
    if (this.#dialog) {
      return;
    }

    const dialog = document.createElement("dialog");
    dialog.id = this.#dialogID;
    dialog.className = "a2otour-species-dialog";
    dialog.setAttribute("aria-labelledby", `${this.#dialogID}-title`);

    const card = document.createElement("article");
    card.className = "species-verification-example-card";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "a2otour-species-dialog-close";
    closeButton.setAttribute("aria-label", "Close species details");
    closeButton.textContent = "";
    closeButton.addEventListener("click", () => this.#closeDialog());

    const info = document.createElement("div");
    info.className = "site-info";

    const visual = document.createElement("div");
    visual.className = "site-info-visual";

    this.#largeImage = document.createElement("img");
    this.#largeImage.className = "site-info-image";
    this.#largeImage.alt = "";
    this.#largeImage.addEventListener("error", () => {
      console.error(`Failed to load species image: ${this.#largeImage.src}`);
      this.#largeImage.hidden = true;
    });

    this.#title = document.createElement("h2");
    this.#title.className = "site-info-title";
    this.#title.id = `${this.#dialogID}-title`;

    visual.append(this.#largeImage, this.#title);

    const content = document.createElement("div");
    content.className = "site-info-content";

    this.#description = document.createElement("p");
    this.#description.className = "site-info-text";

    this.#examples = document.createElement("div");
    this.#examples.className = "a2otour-species-examples";

    content.append(this.#description, this.#examples);
    info.append(visual, content);
    card.append(closeButton, info);
    dialog.append(card);
    dialog.addEventListener("cancel", () => this.#clearExamples());
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) {
        this.#closeDialog();
      }
    });

    // append outside the shadow DOM
    document.body.append(dialog);
    this.#dialog = dialog;
  }

  /** Populate the dialog with the selected species and its configured examples. */
  #renderDialog() {
    const species = this.#species;
    this.#title.textContent = species.name || "Species";
    this.#description.textContent = species.description || "";
    this.#description.hidden = !species.description;

    const imageURL = species.image_url || species.thumbnail_url;
    this.#largeImage.hidden = !imageURL;
    if (imageURL && this.#largeImage.getAttribute("src") !== imageURL) {
      this.#largeImage.setAttribute("src", imageURL);
    }

    this.#clearExamples();
    species.examples.forEach(({ url, label }, index) => {
      this.#examples.append(this.#createExample(url, label, index));
    });
  }

  /** Create one labeled spectrogram and its matching playback controls. */
  #createExample(url, label, index) {
    const item = document.createElement("div");
    item.className = "a2otour-species-example-item";

    const spectrogramContainer = document.createElement("div");
    spectrogramContainer.className = "site-info-spectrogram";

    if (label !== null) {
      const exampleLabel = document.createElement("p");
      exampleLabel.className = "site-info-text a2otour-species-example-label";
      exampleLabel.textContent = label;
      item.append(exampleLabel);
    }

    const spectrogramID = `${this.#dialogID}-spectrogram-${index + 1}`;
    const spectrogram = document.createElement("oe-spectrogram");
    spectrogram.id = spectrogramID;
    spectrogram.className = "site-info-spectrogram-view";
    spectrogram.setAttribute("src", url);
    spectrogram.setAttribute("scaling", "stretch");
    spectrogram.setAttribute("color-map", "grayscale");
    spectrogram.setAttribute("window-size", "512");
    spectrogram.setAttribute("window-function", "hamming");
    spectrogram.setAttribute("brightness", "0.05");
    spectrogram.setAttribute("contrast", "1.05");

    const player = document.createElement("div");
    player.className = "site-info-spectrogram-player";

    const controls = document.createElement("oe-media-controls");
    controls.setAttribute("for", spectrogramID);
    controls.append(
      this.#createControlLabel("play-icon", "play-fill", "Play"),
      this.#createControlLabel("pause-icon", "pause-fill", "Pause"),
    );
    player.append(controls);
    spectrogramContainer.append(spectrogram, player);
    item.append(spectrogramContainer);
    return item;
  }

  /** Create a slotted icon-and-text label for a media-control state. */
  #createControlLabel(slot, iconName, text) {
    const label = document.createElement("span");
    label.slot = slot;
    label.className = "site-info-spectrogram-action";

    const icon = document.createElement("sl-icon");
    icon.setAttribute("name", iconName);
    label.append(icon, document.createTextNode(text));
    return label;
  }

  /** Remove mounted example players when the dialog closes or is refreshed. */
  #clearExamples() {
    this.#examples?.replaceChildren();
  }

  /** Close the dialog and remove its mounted example players. */
  #closeDialog() {
    if (this.#dialog?.open) {
      this.#dialog.close();
    }
    this.#clearExamples();
  }
}

if (!customElements.get("a2otour-species-example")) {
  customElements.define("a2otour-species-example", A2OTourSpeciesExample);
}
