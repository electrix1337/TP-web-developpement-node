const periodicRefreshPeriod = 10;
let hold_Periodic_Refresh = false;

let categories = [];
let selectedCategory = "";

let search = "";
let currentETag = "";

let pageManager;
let itemLayout;
let endOfData = false;
let article = 0;

let contentScrollPosition = 0;

let offset = 0;
let previousScrollPosition = 0;
let rowHeight = 28 - 1;
let limit = getLimit();

let waiting = null;
let waitingGifTrigger = 2000;
let showKeywords = false;

function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        $("#postsPanel").append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

function getLimit() {
    // estimate the value of limit according to height of content
    return Math.round($("#scrollPanel").innerHeight() / rowHeight);
}

function makeFavicon(url, big = false) {
    // Utiliser l'API de google pour extraire le favicon du site pointé par url
    // retourne un élément div comportant le favicon en tant qu'image de fond
    ///////////////////////////////////////////////////////////////////////////


    if (url.slice(-1) != "/") url += "/";
    let faviconClass = "favicon";
    if (big) faviconClass = "big-favicon";
    url = "http://www.google.com/s2/favicons?sz=64&domain=" + url;

    return `<div class="${faviconClass}" style="background-image: url('${url}');"></div>`;
}

Init_UI();

async function Init_UI() {
    let postItemLayout = {
        width: $("#postsPanel").outerWidth(),
        height: $("#postsPanel").outerHeight()
    };
    pageManager = new PageManager('scrollPanel', 'postsPanel', postItemLayout, renderPosts);
    compileCategories();

    offset = pageManager.offset;


    $("#actionTitle").text("Fil de nouvelles");
    $("#search").show();
    $("#abort").hide();
    $("#errorContainer").hide();

    $('#abort').on("click", async function () {
        showPosts();
    });
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $("#searchKey").on("change", () => {
        doSearch();
    })
    $('#doSearch').on('click', () => {
        doSearch();
    })
    $('#createPost').on('click', () => {
        renderCreatePostForm();
    });
    showPosts();
    start_Periodic_Refresh();
}

function showPosts() {
    $("#actionTitle").text("Fil de nouvelles");
    $("#scrollPanel").show();
    $('#abort').hide();
    $('#form').hide();
    $('#aboutContainer').hide();
    $("#createPost").show();
    hold_Periodic_Refresh = false;
}
function hidePosts() {
    $("#scrollPanel").hide();
    $("#createPost").hide();
    $("#abort").show();
    hold_Periodic_Refresh = true;
}

function renderAbout() {
    hidePosts();
    $("#actionTitle").text("À propos...");
    $("#aboutContainer").show();
}

function renderError(message) {
    hidePosts();
    $("#actionTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").append($(`<div>${message}</div>`));
}

function doSearch() {
    search = $("#searchKey").val().replace(' ', ',');
    pageManager.reset();
}

function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            let etag = await Posts_API.HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                article = 0;
                await pageManager.update(false);
                compileCategories();
            }
        }
    },
    periodicRefreshPeriod * 1000);
}

async function compileCategories() {
    categories = [];
    let response = await Posts_API.GetQuery("?fields=category&sort=category");
    if (!Posts_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            updateDropDownMenu(categories);
        }
    }
}

function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        showPosts();
        selectedCategory = "";
        updateDropDownMenu();
        pageManager.reset();
    });
    $('.category').on("click", function () {
        showPosts();
        selectedCategory = $(this).text().trim();
        updateDropDownMenu();
        pageManager.reset();
    });
}

async function renderPosts(queryString) {
    let endOfData = false;
    if (search != "") queryString += "&keywords=" + search;
    queryString += "&sort=category";
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    // console.log(limit);
    // console.log(offset);
    // queryString += "&limit=" + limit + "&offset=" + offset;
    addWaitingGif();
    let response = await Posts_API.Get(queryString);
    if (!Posts_API.error) {
        currentETag = response.ETag;
        let posts = response.data;
        if (posts.length > 0) {
            posts.forEach(post => {
                $("#postsPanel").append(getPosts(post));
            });
            $(".editCmd").off();
            $(".editCmd").on("click", function () {
                renderEditPostForm($(this).attr("editPostId"));
            });
            $(".deleteCmd").off();
            $(".deleteCmd").on("click", function () {
                renderDeletePostForm($(this).attr("deletePostId"));
            });
            $("#scrollPanel").on("scroll", function () {
                console.log($("#scrollPanel").scrollTop())
                if ($("#scrollPanel").scrollTop() + $("#scrollPanel").innerHeight() > ($("#postsPanel").height() - rowHeight)) {
                    $("#scrollPanel").off();
                    offset++;
                    console.log(offset);
                    renderPosts();
                }
            });
            attachPostsUiEvents();
        } else{
            endOfData = true;
        }
    } else {
        renderError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}

function formatText() {
    $.each($(".postText"), function () {
        let postText = $(this);
        var str = postText.html();
        var regex = /[\r\n]/g;
        postText.html(str.replace(regex, "<br>"));
    })
}

function showDefinition(word, definition) {
    $('#showDefinition').dialog('option', 'title', word);
    $('#definition').html(definition);
    $("#showDefinition").dialog('open');
}

function convertToFrenchDate(numeric_date) {
    date = new Date(numeric_date);
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    var opt_weekday = { weekday: 'long' };
    var weekday = toTitleCase(date.toLocaleDateString("fr-FR", opt_weekday));

    function toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    }
    return weekday + " le " + date.toLocaleDateString("fr-FR", options) + " @ " + date.toLocaleTimeString("fr-FR");
}

function UnderlineKeyWord(text) {
    let keyword = $("#searchKey").val().toLowerCase();
    let finalString = text;
    let lowerText = text.toLowerCase();
    if (keyword != "" && keyword != undefined) {
        for (var i = lowerText.length - keyword.length; i >= 0; --i) {
            if (lowerText.substring(i, i + keyword.length) == keyword) {
                finalString = finalString.substring(0, i) + '<span class="yellowbg">' + 
                    finalString.substring(i, i + keyword.length) + "</span>" + finalString.substring(i + keyword.length);
            }
        }
    } else {
        finalString = text;
    }
    return finalString;
}

async function renderDeletePostForm(id) {
    hidePosts();
    $("#actionTitle").text("Retrait");
    $('#form').show();
    $('#form').empty();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let post = response.data;

        if (post !== null) {
            let date = convertToFrenchDate(post.Creation);
            $("#form").append(`
                <h4>Effacer la nouvelle suivante?</h4>
                 </div>
                    <br>
                    <input type="button" value="Effacer" id="deletePost" class="btn btn-primary">
                    <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
                </div>    
                <br> <hr>
                <div class="post" id="${post.Id}">
                <div class="postHeader">  ${post.Category} </div>
                <div class="postTitle ellipsis"> ${post.Title} </div>
                <img class="postImage" src='${post.Image}'/>
                <div class="postDate"> ${date} </div>
                <div class="postTextContainer showExtra">
                    <div class="postText">${post.Text}</div>
                </div>
            `);
            formatText();
            $('#deletePost').on("click", async function () {
                await Posts_API.Delete(post.Id);
                if (!Posts_API.error) {
                    showPosts();
                    await pageManager.update(false);
                    compileCategories();
                }
                else {
                    console.log(Posts_API.currentHttpError)
                    renderError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", function () {
                showPosts();
            });

        } else {
            renderError("Post introuvable!");
        }
    } else
        renderError(Posts_API.currentHttpError);
}

// function getPosts(post) {
//     return $(`
//         <div id="${post.Id}" class="post">
//             <div class="flexOut">
//                 <div class='category' data-placement='bottom'>
//                     ${UnderlineKeyWord(post.Category)}
//                 </div>
//                 <div class="flexButtons">
//                     <span class="editCmd cmdIcon fa fa-pencil" editPostId="${post.Id}" title="Modifier"></span>
//                     <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${post.Id}" title="Effacer nouvelle"></span>
//                 </div>
//             </div>
//             <div class='titre' data-placement='bottom'>${UnderlineKeyWord(post.Title)}</div>
//             <div class="imageContainer">
//                 <img class="articleImage" src="${post.Image}">
//             </div>
//             <div class="dateContainer">
//                 ${UnderlineKeyWord(convertToFrenchDate(post.Creation))}
//             </div><br>
//             <div class="postTextContainer hideExtra">
//                 <div class="postText">${UnderlineKeyWord(post.Text)}</div>
//             </div>
//             <div class="postfooter">
//                 <span class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
//                 <span class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
//             </div>
//         </div>
//         <hr>`);
// }

function getPosts(post) {
    let date = convertToFrenchDate(post.Creation);
    article++;
    return $(`
        <div class="post" id="${post.Id}">
            <div class="postHeader">
                ${post.Category}
                <div class="flexButtons">
                    <span class="editCmd cmdIcon fa fa-pencil" editPostId="${post.Id}" title="Modifier nouvelle"></span>
                    <span class="deleteCmd cmdIcon fa fa-trash" deletePostId="${post.Id}" title="Effacer nouvelle"></span>
                </div>
            </div>
            <div class="postTitle"> ${UnderlineKeyWord(post.Title)} </div>
            <div class="imageContainer">
                <img class="articleImage" src='${post.Image}'/>
            </div>
            <div class="postDate"> ${date} </div>
            <div class="postTextContainer hideExtra">
                <div class="postText">${UnderlineKeyWord(post.Text)}</div>
            </div>
            ${article}
            <div class="postfooter">
                <span class="moreText cmdIconXSmall fa fa-angle-double-down" title="Afficher la suite"></span>
                <span class="lessText cmdIconXSmall fa fa-angle-double-up" title="Réduire..."></span>
            </div>
        </div>
        <hr>
    `);
}

function attachPostsUiEvents() {
    $(".lessText").hide();
    $(".postfooter").hide();
    formatText();
    $.each($(".postTextContainer"), function () {
        let text = $(this).find(">:first-child");

        if ($(this).innerHeight() < text.outerHeight()) {
            let postFooter = $(this).parent().find(">:last-child");
            postFooter.show();
            let lessText = postFooter.find(">:last-child");
            lessText.hide();
        }
    })

    $.each($(".flexButtons"), function () {
        let editIcon = $(this).find(">:nth-child(1)");
        let deleteIcon = $(this).find(">:nth-child(2)");
    })

    $(".moreText").click(function () {
        let moreText = $(this);
        let postTextContainer = $(this).parent().parent().find(">:nth-child(5)");
        postTextContainer.addClass('showExtra');
        postTextContainer.removeClass('hideExtra');
        let lessText = moreText.parent().find(">:last-child");
        moreText.hide();
        lessText.show();
    })

    $(".lessText").click(function () {
        let lessText = $(this);
        let postTextContainer = lessText.parent().parent().find(">:nth-child(5)");
        postTextContainer.addClass('hideExtra');
        postTextContainer.removeClass('showExtra');
        let moreText = $(this).parent().find(">:first-child");
        moreText.show();
        lessText.hide();
    })
}

function newPost() {
    Post = {};
    Post.Id = 0;
    Post.Title = "";
    Post.Text = "";
    Post.Image = "post_logo.png";
    Post.Category = "";
    date = new Date();
    Post.Creation = date.getTimezoneOffset();
    return Post;
}

function renderCreatePostForm() {
    renderPostForm();
}

async function renderEditPostForm(id) {
    addWaitingGif();
    let response = await Posts_API.Get(id)
    if (!Posts_API.error) {
        let Post = response.data;
        if (Post !== null)
            renderPostForm(Post);
        else
            renderError("Post introuvable!");
    } else {
        renderError(Posts_API.currentHttpError);
    }
    removeWaitingGif();
}

function renderPostForm(post = null) {
    hidePosts();
    let create = post == null;
    if (create) post = newPost();
    $("#actionTitle").text(create ? "Création" : "Modification");
    $("#form").show();
    $("#form").empty();
    $("#form").append(`
        <form class="form" id="postForm">
            <input type="hidden" name="Id" value="${post.Id}"/>
            <input type="hidden" name="Creation" value="${post.Creation}"/>
            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${post.Category}"
            />
            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control"
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${post.Title}"
            />
            <label for="Text" class="form-label">Texte</label>
             <textarea class="form-control" 
                          name="Text" 
                          id="Text"
                          placeholder="Texte" 
                          rows="9"
                          required 
                          RequireMessage = 'Veuillez entrer une Description'>${post.Text}</textarea>

            <label class="form-label">Image </label>
            <div class='imageUploaderContainer'>
                <div class='imageUploader' 
                     newImage='${create}' 
                     controlId='Image' 
                     imageSrc='${post.Image}' 
                     waitingImage="Loading_icon.gif">
                </div>
            </div>
           
            <div id="keepDateControl">
                <input type="checkbox" name="keepDate" id="keepDate" class="checkbox" checked>
                <label for="keepDate"> Conserver la date de création </label>
                <br>
            </div>
            <br>
            <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">

        </form>
    `);
    if (create) $("#keepDateControl").hide();
    initFormValidation();
    initImageUploaders();
    $("#Url").on("change", function () {
        let favicon = makeFavicon($("#Url").val(), true);
        $("#faviconLink").empty();
        $("#faviconLink").attr("href", $("#Url").val());
        $("#faviconLink").append(favicon);
    })
    $('#postForm').on("submit", async function (event) {
        article = 0;
        event.preventDefault();
        let post = getFormData($("#postForm"));
        if (post.Category != selectedCategory) 
            selectedCategory = "";
        if (create || !('keepDate' in post)) post.Creation = Date.now();
        if ('keepDate' in post) {
            delete post.keepDate;
        }
        post = await Posts_API.Save(post, create);
        if (!Posts_API.error) {
            showPosts();
            await pageManager.update(false);
            compileCategories();
            pageManager.scrollToElem(post.Id);
        }
        else
            renderError("Une erreur est survenue!");
    });
    $('#cancel').on("click", function () {
        showPosts();
    });
}

function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    console.log($form.serializeArray());
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}

function eraseContent() {
    showWaitingGif();
    $("#content").empty();
}
function saveContentScrollPosition() {
    contentScrollPosition = $("#content").scrollTop();
    console.log("Save SP", $("#content").scrollTop());
}
function restoreContentScrollPosition() {
    $("#content").scrollTop(contentScrollPosition);
    console.log("Restore SP", $("#content").scrollTop());
}

// function RenderAddPost(post) {
//     let create = post == null;
//     if (create)
//         post = newPost();
//     $("#postsPanel").html(`
//         <form class="form" id="PostForm">
//             <label for="Title" class="form-label">post </label>
//             <input type="hidden" name="Id" value="${post.Id}"/>
//             <input type="hidden" name="Creation" value="${post.Creation}"/>
//             <input 
//                 class="form-control Alpha"
//                 name="Title" 
//                 id="Title" 
//                 placeholder="Titre"
//                 required
//                 RequireMessage="Veuillez entrer un titre"
//                 InvalidMessage="Le titre comporte un caractère illégal"
//                 value="${post.Title}"
//             />
//             <label for="Text" class="form-label">Text </label>
//             <input
//                 class="form-control Text"
//                 name="Text"
//                 id="Text"
//                 placeholder="Text"
//                 required
//                 value="${post.Text}" 
//             />
//             <label for="Category" class="form-label">Catégorie </label>
//             <input 
//                 class="form-control"
//                 name="Category"
//                 id="Category"
//                 placeholder="Catégorie"
//                 required
//                 value="${post.Category}"
//             />
//             <div   
//                     class='imageUploader' 
//                    newImage='${create}' 
//                    controlId='Image'
//                    imageSrc='${post.Image}' 
//                    waitingImage="Loading_icon.gif"></div>
//             <br>
//             <input type="submit" value="Enregistrer" id="savePost" class="btn btn-primary">
//             <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
//         </form>`);
//     initImageUploaders();
//     initFormValidation()

//     $('#PostForm').on("submit", async function (event) {
//         event.preventDefault();
//         let post = getFormData($("#PostForm"));
//         post = await Posts_API.savePost(post, create);
//         if (!Posts_API.error) {
//             showPosts();
//             await pageManager.update(false);
//             compileCategories();
//             pageManager.scrollToElem(Post.Id);
//         }
//         else
//             renderError("Une erreur est survenue!");
//     });
//     $('#cancel').on("click", function () {
//         showPosts();
//     });
// }