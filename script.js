$(document).ready(function() {
    const omdbApiKey = '67b85ad0'; // Replace with your OMDb API key
    const omdbBaseUrl = 'http://www.omdbapi.com/';
    const vidsrcBaseUrl = 'https://vidsrc.xyz/';

    let currentMoviesPage = 1;
    let currentTvShowsPage = 1;
    let currentEpisodesPage = 1;
    let currentOmdbData = null; // To store OMDb data for later playback

    // Initial UI setup
    hideAllSections();
    $('#searchType').trigger('change'); // Trigger change to set initial input visibility

    // --- Event Handlers ---

    $('#searchType').on('change', function() {
        const type = $(this).val();
        $('#seasonInput, #episodeInput, #autonextSwitchContainer').addClass('d-none');
        $('#subUrlInput, #dsLangInput, #autoplayCheck').removeClass('d-none'); // Common for embed URLs

        if (type === 'episode-embed') {
            $('#seasonInput, #episodeInput, #autonextSwitchContainer').removeClass('d-none');
            $('#searchInput').attr('placeholder', 'Enter IMDb/TMDB ID');
        } else if (type === 'movie-embed' || type === 'tv-embed') {
            $('#searchInput').attr('placeholder', 'Enter IMDb/TMDB ID');
        } else { // OMDb movie or TV
            $('#searchInput').attr('placeholder', 'Enter Title or IMDb ID');
            // Hide subtitle and language inputs for OMDb search as they are for embed URLs
            $('#subUrlInput, #dsLangInput').addClass('d-none');
        }
    });

    $('#searchButton').on('click', function() {
        const searchType = $('#searchType').val();
        const query = $('#searchInput').val().trim();
        const season = $('#seasonInput').val().trim();
        const episode = $('#episodeInput').val().trim();

        if (!query) {
            displayError("Please enter a search query.");
            return;
        }

        hideAllSections(); // Clear previous results

        if (searchType === 'movie' || searchType === 'tv') {
            fetchOmdbDetails(query, searchType);
        } else {
            // Direct embed URL construction
            let embedUrl = '';
            let videoTitle = `Playing content for ID: ${query}`;
            if (searchType === 'movie-embed') {
                embedUrl = buildEmbedUrl('movie', query);
                videoTitle = `Movie: ${query}`;
            } else if (searchType === 'tv-embed') {
                embedUrl = buildEmbedUrl('tv', query);
                videoTitle = `TV Show: ${query}`;
            } else if (searchType === 'episode-embed') {
                if (!season || !episode) {
                    displayError("Season and Episode are required for episodes.");
                    return;
                }
                embedUrl = buildEmbedUrl('episode', query, season, episode);
                videoTitle = `TV Show: ${query} - S${season}E${episode}`;
            }

            if (embedUrl) {
                embedVideo(embedUrl, videoTitle);
            } else {
                displayError("Could not construct embed URL.");
            }
        }
    });

    $('#playOmdbItemButton').on('click', function() {
        if (currentOmdbData && currentOmdbData.imdbID) {
            const type = currentOmdbData.Type === 'series' ? 'tv' : 'movie';
            let embedUrl;
            let videoTitle = currentOmdbData.Title;

            if (type === 'movie') {
                 embedUrl = buildEmbedUrl('movie', currentOmdbData.imdbID);
            } else { // TV Show - user would need to select episode, for now, just embed show
                // For simplicity, this button will embed the TV show directly.
                // A more advanced version would fetch seasons/episodes.
                // Or, we could try to guess S1E1 if OMDb doesn't provide episode details.
                // The current 'tv-embed' search type is better for specific episodes.
                // This button will act as if user searched for 'tv-embed' with the ID.
                embedUrl = buildEmbedUrl('tv', currentOmdbData.imdbID);
                 // If we have season/episode info (e.g. from an episode search in OMDb)
                if (currentOmdbData.Season && currentOmdbData.Episode) {
                     embedUrl = buildEmbedUrl('episode', currentOmdbData.imdbID, currentOmdbData.Season, currentOmdbData.Episode);
                     videoTitle += ` - S${currentOmdbData.Season}E${currentOmdbData.Episode}`;
                }
            }

            if (embedUrl) {
                hideAllSections(true); // Keep error alert if any
                embedVideo(embedUrl, videoTitle);
            } else {
                displayError("Could not construct embed URL for this item.");
            }
        }
    });


    // --- OMDb Functions ---
    function fetchOmdbDetails(query, type) {
        let searchParams = {
            apikey: omdbApiKey,
            plot: 'full' // Get full plot
        };

        if (query.toLowerCase().startsWith('tt') && /^\d+$/.test(query.substring(2))) {
            searchParams.i = query; // Search by IMDb ID
        } else {
            searchParams.t = query; // Search by Title
        }
        if (type === 'tv') {
            searchParams.type = 'series';
        } else {
            searchParams.type = 'movie';
        }
        // If title search, OMDb might return movie or series.
        // If ID search, it's specific.

        $.ajax({
            url: omdbBaseUrl,
            method: 'GET',
            dataType: 'json',
            data: searchParams,
            success: function(data) {
                if (data.Response === "True") {
                    currentOmdbData = data; // Store for potential playback
                    displayOmdbDetails(data);
                } else {
                    displayError(data.Error || "Media not found in OMDb.");
                    currentOmdbData = null;
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("OMDb AJAX Error:", textStatus, errorThrown);
                displayError("Failed to fetch OMDb data.");
                currentOmdbData = null;
            }
        });
    }

    function displayOmdbDetails(data) {
        $('#omdbTitle').text(data.Title || 'N/A');
        $('#omdbType').text(data.Type ? data.Type.charAt(0).toUpperCase() + data.Type.slice(1) : 'N/A');
        $('#omdbYear').text(data.Year || 'N/A');
        $('#omdbGenre').text(data.Genre || 'N/A');
        $('#omdbDirector').text(data.Director || 'N/A');
        $('#omdbWriter').text(data.Writer || 'N/A');
        $('#omdbActors').text(data.Actors || 'N/A');
        $('#omdbPlot').text(data.Plot || 'N/A');
        $('#omdbRating').text(data.imdbRating ? `${data.imdbRating}/10 (IMDb)` : 'N/A');

        if (data.Poster && data.Poster !== "N/A") {
            $('#omdbPoster').attr('src', data.Poster);
        } else {
            $('#omdbPoster').attr('src', 'https://via.placeholder.com/300x450.png?text=No+Poster');
        }

        $('#omdbDetailsCard').removeClass('d-none');
        if (data.imdbID) { // Only show play button if we have an IMDb ID
            $('#playOmdbItemButton').removeClass('d-none');
        } else {
            $('#playOmdbItemButton').addClass('d-none');
        }
    }

    // --- Embed Functions ---
    function buildEmbedUrl(type, id, season = null, episode = null) {
        let url = vidsrcBaseUrl;
        let queryParams = [];

        if (id.toLowerCase().startsWith('tt')) {
            queryParams.push(`imdb=${id}`);
        } else if (/^\d+$/.test(id)) {
            queryParams.push(`tmdb=${id}`);
        } else {
            displayError("Invalid ID format. Must be IMDb (tt...) or TMDB (numeric).");
            return null;
        }

        if (type === 'movie') {
            url += 'embed/movie';
        } else if (type === 'tv' || type === 'episode') {
            url += 'embed/tv';
            if (type === 'episode' && season && episode) {
                queryParams.push(`season=${season}`);
                queryParams.push(`episode=${episode}`);
                if ($('#autonextCheck').is(':checked')) {
                    queryParams.push('autonext=1');
                }
            }
        } else {
            return null; // Should not happen
        }

        const subUrl = $('#subUrlInput').val().trim();
        if (subUrl) {
            queryParams.push(`sub_url=${encodeURIComponent(subUrl)}`);
        }
        const dsLang = $('#dsLangInput').val().trim();
        if (dsLang) {
            queryParams.push(`ds_lang=${dsLang}`);
        }
        if ($('#autoplayCheck').is(':checked')) {
            queryParams.push('autoplay=1');
        } else {
            queryParams.push('autoplay=0');
        }


        if (queryParams.length > 0) {
            url += '?' + queryParams.join('&');
        }
        return url;
    }


    function embedVideo(url, title = "Playing Media") {
        if (url) {
            $('#vidsrcFrame').attr('src', url);
            $('#videoTitle').text(title);
            $('#videoPlayerSection').removeClass('d-none');
            // Scroll to player
            $('html, body').animate({
                scrollTop: $("#videoPlayerSection").offset().top - 20 // Adjust offset as needed
            }, 500);
        } else {
            $('#videoPlayerSection').addClass('d-none');
        }
    }

    // --- Latest Content Functions ---
    function fetchLatest(type, page, containerId, pageNumId, prevBtnId, nextBtnId) {
        const endpointMap = {
            movies: `movies/latest/page-${page}.json`,
            tvshows: `tvshows/latest/page-${page}.json`,
            episodes: `episodes/latest/page-${page}.json`
        };

        if (!endpointMap[type]) {
            displayError("Invalid latest content type.");
            return;
        }
        const url = vidsrcBaseUrl + endpointMap[type];
        hideError();

        $.ajax({
            url: url,
            method: 'GET',
            dataType: 'json',
            success: function(data) {
                const listContainer = $(`#${containerId}`);
                listContainer.empty();
                if (data && data.result && data.result.length > 0) {
                    data.result.forEach(item => {
                        // Adjusting to use available fields from the new API
                        // Assuming 'item.title' and 'item.imdb_id' or 'item.tmdb_id' are available
                        // And 'item.poster_path' or similar for image
                        // The exact fields need to be confirmed from actual API response
                        let title = item.title || item.name || 'Unknown Title'; // name for TV shows
                        let imdbId = item.imdb_id;
                        let tmdbId = item.tmdb_id;
                        let mediaType = type === 'movies' ? 'movie' : (type === 'tvshows' ? 'tv' : 'episode');
                        let season = item.season_number;
                        let episodeNum = item.episode_number;

                        // Try to get a displayable ID
                        let displayId = imdbId || tmdbId;
                        if (!displayId && mediaType === 'episode' && item.show_imdb_id) {
                            displayId = item.show_imdb_id; // For episodes, use show's ID if item ID not present
                        }


                        let itemHtml = `<a href="#" class="list-group-item list-group-item-action latest-item"
                                           data-id="${displayId}"
                                           data-tmdb-id="${tmdbId || ''}"
                                           data-type="${mediaType}"
                                           data-title="${title.replace(/"/g, '&quot;')}"
                                           ${mediaType === 'episode' && season ? `data-season="${season}"` : ''}
                                           ${mediaType === 'episode' && episodeNum ? `data-episode="${episodeNum}"` : ''}>
                                           ${title}
                                           ${mediaType === 'episode' && season && episodeNum ? ` (S${season} E${episodeNum})` : ''}
                                        </a>`;
                        listContainer.append(itemHtml);
                    });
                    $(`#${pageNumId}`).text(page);
                    $(`#${prevBtnId}, #${nextBtnId}`).removeClass('d-none');
                    if (page === 1) $(`#${prevBtnId}`).addClass('d-none');
                    // We don't know total pages, so Next button is always shown for now
                    // Could hide Next if results are less than expected per page (e.g. < 20)
                } else {
                    listContainer.html('<li class="list-group-item">No items found.</li>');
                    $(`#${nextBtnId}`).addClass('d-none'); // No more items if current page is empty
                    if (page === 1) $(`#${prevBtnId}`).addClass('d-none');
                }
            },
            error: function() {
                displayError(`Failed to load latest ${type}.`);
                $(`#${containerId}`).html(`<li class="list-group-item">Error loading data.</li>`);
            }
        });
    }

    $('#loadLatestMovies').on('click', function() { currentMoviesPage = 1; fetchLatest('movies', currentMoviesPage, 'latestMoviesList', 'moviesPageNum', 'prevMoviesPage', 'nextMoviesPage'); });
    $('#prevMoviesPage').on('click', function() { if (currentMoviesPage > 1) { currentMoviesPage--; fetchLatest('movies', currentMoviesPage, 'latestMoviesList', 'moviesPageNum', 'prevMoviesPage', 'nextMoviesPage'); } });
    $('#nextMoviesPage').on('click', function() { currentMoviesPage++; fetchLatest('movies', currentMoviesPage, 'latestMoviesList', 'moviesPageNum', 'prevMoviesPage', 'nextMoviesPage'); });

    $('#loadLatestTvShows').on('click', function() { currentTvShowsPage = 1; fetchLatest('tvshows', currentTvShowsPage, 'latestTvShowsList', 'tvShowsPageNum', 'prevTvShowsPage', 'nextTvShowsPage'); });
    $('#prevTvShowsPage').on('click', function() { if (currentTvShowsPage > 1) { currentTvShowsPage--; fetchLatest('tvshows', currentTvShowsPage, 'latestTvShowsList', 'tvShowsPageNum', 'prevTvShowsPage', 'nextTvShowsPage'); } });
    $('#nextTvShowsPage').on('click', function() { currentTvShowsPage++; fetchLatest('tvshows', currentTvShowsPage, 'latestTvShowsList', 'tvShowsPageNum', 'prevTvShowsPage', 'nextTvShowsPage'); });

    $('#loadLatestEpisodes').on('click', function() { currentEpisodesPage = 1; fetchLatest('episodes', currentEpisodesPage, 'latestEpisodesList', 'episodesPageNum', 'prevEpisodesPage', 'nextEpisodesPage'); });
    $('#prevEpisodesPage').on('click', function() { if (currentEpisodesPage > 1) { currentEpisodesPage--; fetchLatest('episodes', currentEpisodesPage, 'latestEpisodesList', 'episodesPageNum', 'prevEpisodesPage', 'nextEpisodesPage'); } });
    $('#nextEpisodesPage').on('click', function() { currentEpisodesPage++; fetchLatest('episodes', currentEpisodesPage, 'latestEpisodesList', 'episodesPageNum', 'prevEpisodesPage', 'nextEpisodesPage'); });

    // Click handler for items in the "latest" lists
    $(document).on('click', '.latest-item', function(e) {
        e.preventDefault();
        hideAllSections(true); // keep error section

        const id = $(this).data('id');
        const tmdbId = $(this).data('tmdb-id'); // Prefer TMDB ID if available for vidsrc
        const type = $(this).data('type');
        const title = $(this).data('title');
        const season = $(this).data('season');
        const episode = $(this).data('episode');

        let finalId = tmdbId || id; // Use TMDB if present, otherwise IMDb
        if (!finalId) {
            displayError("No valid ID found for this item.");
            return;
        }

        let embedUrl;
        let videoTitle = title;

        if (type === 'movie') {
            embedUrl = buildEmbedUrl('movie', finalId);
        } else if (type === 'tv') {
            embedUrl = buildEmbedUrl('tv', finalId);
        } else if (type === 'episode') {
            if (!season || !episode) {
                // If episode lacks S/E numbers, try to embed the show
                // This might happen if API gives episode title but not its S/E for some reason
                embedUrl = buildEmbedUrl('tv', finalId); // finalId should be show's ID here
                videoTitle = `TV Show: ${title}`; // Title might be episode title, adjust if needed
            } else {
                 embedUrl = buildEmbedUrl('episode', finalId, season, episode); // finalId should be show's ID
                 videoTitle = `${title} - S${season}E${episode}`;
            }
        }

        if (embedUrl) {
            embedVideo(embedUrl, videoTitle);
        } else {
            displayError("Could not construct embed URL for selected item.");
        }
    });


    // --- Utility Functions ---
    function displayError(message) {
        $('#errorAlert').text(message).removeClass('d-none');
        // Optionally hide other content sections when a major error occurs
        // $('#omdbDetailsCard').addClass('d-none');
        // $('#videoPlayerSection').addClass('d-none');
    }

    function hideError() {
        $('#errorAlert').addClass('d-none');
    }

    function hideAllSections(keepError = false) {
        $('#omdbDetailsCard').addClass('d-none');
        $('#videoPlayerSection').addClass('d-none');
        $('#vidsrcFrame').attr('src', ''); // Stop video
        $('#playOmdbItemButton').addClass('d-none');
        currentOmdbData = null;
        if (!keepError) {
            hideError();
        }
    }

    // Allow search on pressing Enter in input fields
    $('#searchInput, #seasonInput, #episodeInput').on('keypress', function(e) {
        if (e.which === 13) { // Enter key pressed
            // If suggestions are visible, Enter might select one, otherwise search
            if ($('#suggestionsDropdown').is(':visible') && $('#suggestionsDropdown .list-group-item.active').length) {
                $('#suggestionsDropdown .list-group-item.active').click();
                return; // Avoid triggering search button if suggestion is selected
            }
            $('#searchButton').click();
        }
    });

    // --- Autocomplete Functionality ---
    let debounceTimer;
    $('#searchInput').on('keyup', function(e) {
        const query = $(this).val().trim();
        const suggestionsDropdown = $('#suggestionsDropdown');

        // Clear previous timer
        clearTimeout(debounceTimer);

        if (query.length < 3) { // Minimum characters to trigger autocomplete
            suggestionsDropdown.hide().empty();
            return;
        }

        // Ignore up/down/enter keys for this specific handler to allow navigation
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter") {
            return;
        }

        debounceTimer = setTimeout(() => {
            const searchType = $('#searchType').val();
            let omdbSearchType = '';
            if (searchType === 'movie' || searchType === 'movie-embed') {
                omdbSearchType = 'movie';
            } else if (searchType === 'tv' || searchType === 'tv-embed' || searchType === 'episode-embed') {
                omdbSearchType = 'series';
            } else {
                suggestionsDropdown.hide().empty();
                return; // Only provide suggestions for movies/series
            }

            $.ajax({
                url: omdbBaseUrl,
                method: 'GET',
                dataType: 'json',
                data: {
                    apikey: omdbApiKey,
                    s: query, // 's' parameter for search by title (multiple results)
                    type: omdbSearchType
                },
                success: function(data) {
                    suggestionsDropdown.empty();
                    if (data.Response === "True" && data.Search) {
                        data.Search.slice(0, 5).forEach(item => { // Show top 5 suggestions
                            const suggestionItem = $(`<a href="#" class="list-group-item list-group-item-action suggestion-item">${item.Title} (${item.Year})</a>`);
                            suggestionItem.on('click', function(e) {
                                e.preventDefault();
                                $('#searchInput').val(item.Title); // Fill input with selected title
                                suggestionsDropdown.hide().empty();
                                // Optionally, trigger search directly:
                                // $('#searchButton').click();
                            });
                            suggestionsDropdown.append(suggestionItem);
                        });
                        if (data.Search.length > 0) {
                            suggestionsDropdown.show();
                        } else {
                            suggestionsDropdown.hide();
                        }
                    } else {
                        suggestionsDropdown.hide();
                    }
                },
                error: function() {
                    console.error("Error fetching autocomplete suggestions.");
                    suggestionsDropdown.hide().empty();
                }
            });
        }, 300); // Debounce time in ms
    });

    // Keyboard navigation for suggestions
    $('#searchInput').on('keydown', function(e) {
        const suggestionsDropdown = $('#suggestionsDropdown');
        if (!suggestionsDropdown.is(':visible') || suggestionsDropdown.children().length === 0) {
            return;
        }

        let currentActive = suggestionsDropdown.find('.list-group-item.active');

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (currentActive.length === 0) {
                suggestionsDropdown.children().first().addClass('active');
            } else {
                currentActive.removeClass('active');
                let next = currentActive.next();
                if (next.length === 0) { // If at the end, cycle to first
                    next = suggestionsDropdown.children().first();
                }
                next.addClass('active');
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (currentActive.length === 0) {
                suggestionsDropdown.children().last().addClass('active');
            } else {
                currentActive.removeClass('active');
                let prev = currentActive.prev();
                if (prev.length === 0) { // If at the beginning, cycle to last
                    prev = suggestionsDropdown.children().last();
                }
                prev.addClass('active');
            }
        } else if (e.key === "Enter") {
            if (currentActive.length > 0) {
                e.preventDefault(); // Prevent form submission if handled by suggestion click
                currentActive.click();
            }
        } else if (e.key === "Escape") {
            suggestionsDropdown.hide().empty();
        }
    });


    // Hide suggestions when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.input-group').length) {
            $('#suggestionsDropdown').hide().empty();
        }
    });


    // Load latest movies by default on page load (optional)
    // fetchLatest('movies', currentMoviesPage, 'latestMoviesList', 'moviesPageNum', 'prevMoviesPage', 'nextMoviesPage');
});
