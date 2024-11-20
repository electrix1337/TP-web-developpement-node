class PageManager {
    // getItemsCallBack must return true when there is no more data to collect
    constructor(scrollPanelId, itemsPanelId, itemLayout, getItemsCallBack) {
        this.scrollPanel = $(`#${scrollPanelId}`);
        this.itemsPanel = $(`#${itemsPanelId}`);
        this.itemLayout = itemLayout;
        this.currentPage = { limit: -1, offset: -1 };
        this.resizeTimer = null;
        this.resizeEndTriggerDelai = 300;
        this.getItems = getItemsCallBack;
        this.installViewportReziseEvent();
        this.reset();
    }
    reset() {
        this.resetScrollPosition();
        this.update(false);
    }
    installViewportReziseEvent() {
        let instance = this;
        $(window).on('resize', function (e) {
            clearTimeout(instance.resizeTimer);
            instance.resizeTimer = setTimeout(() => { instance.update(false); }, instance.resizeEndTriggerDelai);
        });
    }
    setCurrentPageLimit() {
        let nbColumns = Math.trunc(this.scrollPanel.innerWidth() / this.itemLayout.width);
        if (nbColumns < 1 || isNaN(nbColumns)) {
            nbColumns = 1;
        }
        let nbRows = Math.round(this.scrollPanel.innerHeight() / this.itemLayout.height);
        if (nbRows < 1 || isNaN(nbRows) || !isFinite(nbRows)) {
            nbRows = 1;
        }
        console.log(this.itemLayout.height);
        this.currentPage.limit = nbRows * nbColumns + nbColumns /* make sure to always have a content overflow */;
    }
    currentPageToQueryString(append = false) {
        this.setCurrentPageLimit();
        let limit = this.currentPage.limit;
        let offset = this.currentPage.offset;
        if (!append) {
            limit = limit * (offset + 1);
            offset = 0;
        }
        console.log(limit);
        return `?limit=${limit}&offset=${offset}`;
    }
    scrollToElem(elemId) {
        let itemToReach = $("#" + elemId);
        if (itemToReach) {
            let itemsContainer = itemToReach.parent();
            this.scrollPanel.animate({
                scrollTop: itemToReach.offset().top - itemsContainer.offset().top
            }, 500);
        }
    }
    scrollPosition() {
        return this.scrollPanel.scrollTop();
    }
    storeScrollPosition() {
        this.scrollPanel.off();
        this.previousScrollPosition = this.scrollPosition();
    }
    resetScrollPosition() {
        this.currentPage.offset = 0;
        this.scrollPanel.off();
        this.scrollPanel.scrollTop(0);
    }
    restoreScrollPosition() {
        this.scrollPanel.off();
        this.scrollPanel.scrollTop(this.previousScrollPosition);
    }
    async update(append = true) {
        this.storeScrollPosition();
        if (!append) this.itemsPanel.empty();
        let endOfData = await this.getItems(this.currentPageToQueryString(append));
        this.restoreScrollPosition();
        let instance = this;
        this.scrollPanel.scroll(function () {
            console.log(instance.scrollPanel.scrollTop() + instance.scrollPanel.outerHeight() + "   fdsdjifofiugsjsaiufjdfs  " + (instance.itemsPanel.outerHeight() - instance.itemLayout.height / 2));
            if (!endOfData && (instance.scrollPanel.scrollTop() + instance.scrollPanel.outerHeight() >= instance.itemsPanel.outerHeight() - instance.itemLayout.height / 2)) {
                instance.scrollPanel.off();
                instance.currentPage.offset++;
                instance.update(true);
            }
        });
    }
}