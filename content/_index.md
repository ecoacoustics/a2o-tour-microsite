+++
title = "Home"
date = 2023-01-01T08:00:00-07:00
+++

<script>
function stopSiteInfoAudio(container) {
    const audio = container.querySelector(".site-info-audio");
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    container.querySelectorAll(".species-item-play.is-playing").forEach((button) => {
        button.classList.remove("is-playing");
        button.querySelector("sl-icon").name = "volume-up";
        button.ariaLabel = button.dataset.playLabel;
    });
}

document.addEventListener("click", (event) => {
    const button = event.target.closest(".species-item-play[data-audio-url]");
    if (!button) return;

    event.preventDefault();
    const container = button.closest(".site-info");
    const audio = container?.querySelector(".site-info-audio");
    if (!container || !audio) return;

    button.dataset.playLabel ||= button.ariaLabel;
    if (button.classList.contains("is-playing")) {
        stopSiteInfoAudio(container);
        return;
    }

    document.querySelectorAll(".site-info-audio").forEach((otherAudio) => {
        if (otherAudio !== audio) stopSiteInfoAudio(otherAudio.closest(".site-info"));
    });
    stopSiteInfoAudio(container);
    audio.src = button.dataset.audioUrl;
    audio.onended = () => stopSiteInfoAudio(container);
    audio.play().then(() => {
        button.classList.add("is-playing");
        button.querySelector("sl-icon").name = "stop-fill";
        button.ariaLabel = button.dataset.playLabel.replace("Play", "Stop");
    }).catch(() => {
        button.ariaLabel = "Audio unavailable";
    });
});

function onMapCalloutHidden(callout) {
    stopSiteInfoAudio(callout.querySelector(".site-info"));
}
</script>

{{< section/hero
title="<img class='oe-hero-logo' src='/images/AAO_logo_horiz_white.png' alt=''><span class='home-hero-title-text'>Ecoacoustic Tour Of Australia</span>">}}
{{< /section/hero >}}

{{% section class="oe-call-to-action" %}}

The Australian Acoustic Observatory is a continental-scale acoustic sensor network continuously producing data freely available to researchers, citizen scientists, and the general public.  This Eeoacoustic tour gives you a chance to explore some of the soundscapes and contribute verifications Of automated detections of species of interest. 

<sl-button href="#map-002" variant="primary" pill>
    Use the map to start exploring
    <sl-icon slot="suffix" name="arrow-right" aria-hidden="true"></sl-icon>
</sl-button>
{{% /section %}}


<!-- Google Maps is commented out temporarily because the Maps Demo Key daily quota is exhausted. -->
<!-- The preview-callout-only mode keeps callout styling available without loading Google Maps. -->
{{< map preview-callout-only=true >}}

{{< site-cards >}}

## About the group

{{< section/cards >}}

{{< card image="images/Plains-wanderer.jpg" alt="Plains Wanderer" >}}

### Card Title 1

Some quick example text to build on the card title and make up the bulk of the card's content.

<sl-button href="/" pill>Link to a page</sl-button>
{{< /card>}}

<--->

{{< card image="images/Plains-wanderer.jpg" alt="Plains Wanderer" >}}

### Card Title 2

Some quick example text to build on the card title and make up the bulk of the card's content.

<sl-button href="/" pill>Link to a page</sl-button>
{{< /card >}}

<--->
{{< card image="images/Plains-wanderer.jpg" alt="Plains Wanderer" >}}

### Card Title 3

Some quick example text to build on the card title and make up the bulk of the card's content.

<sl-button href="/" pill>Link to a page</sl-button>
{{< /card >}}

{{< /section/cards >}}

{{< section/image-column
image="images/Plains-wanderer.jpg"
alt="Plains Wanderer in Grass. Image by Dominic Sherony"
caption="Image: Dominic Sherony, CC BY-SA 2.0, via Wikimedia Commons"
imagePosition="left" >}}

## Plains Wanderer Status

Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
[Read More](/)

{{< /section/image-column >}}

<section class="progress-container">
    {{< section/project-progress >}}
    {{< /section/project-progress >}}
    <div>
        <h2>Why it matters</h2>
        <p>
            By helping identify bird calls, you're contributing to a growing
            library of acoustic data that:
        </p>
        <ul>
            <li>Tracks how species respond to climate change</li>
            <li>Monitors ecosystem health after disasters</li>
            <li>
                Guides restoration efforts to ensure habitats don't just
                look right — they sound right, too
            </li>
        </ul>
    </div>
</section>

---

{{< sponsors />}}