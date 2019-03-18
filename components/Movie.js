const { search, checkIsUp, proxies } = require('piratebay-search')
const prompts = require('prompts')
const { download } = require('./DownloadTorrents')
const { PromptUser } = require('./PromptUser')

class Movie {
	constructor(title) {
		this.resultsPageLength = 16
		this.title = title
		this.currentPage = 0
		this.minSeeders = 2
		this.minFileSize = 1
		this.sortBy = 'fileSize'
		this.sortOrder = 'descending'

		if (this.title) this.searchTorrents()
		else
			new PromptUser().askAll().then((response) => {
				Object.assign(this, response)
				this.searchTorrents()
			})
	}
	getFileSize(description) {
		return /Size (\d*\.*\d*)\s(\w*)/.exec(description).slice(1, 3)
	}
	getFileSizeInGB({ description }) {
		// must repeat code due to this function being called within sort() in filterResults() where 'this' doesn't work
		let [ n, unit ] = /Size (\d*\.*\d*)\s(\w*)/.exec(description).slice(1, 3)

		let size = Number(n)
		if (unit === 'KiB') size *= 0.0000009765625
		else if (unit === 'MiB') size *= 0.0009765625
		else if (unit === 'GiB') size *= 0.9765625
		else if (unit === 'TiB') size *= 976.5625

		return size
	}
	getUploadDateString(description) {
		return description.match(/\d\d-\d\d\s\d{4}/)
	}
	getUploadDate({ description }) {
		let [ month, day, year ] = /(\d\d)-(\d\d)\s(\d{4})/.exec(description).slice(1)
		// let date =
		return new Date().setFullYear(year, month, day)
	}
	async showPageOfTorrents(choices) {
		// move onSubmit out to this.onSubmit
		let onSubmit = (prompt, response) => {
			if (response === 'next') this.nextPage()
			else if (response === 'prev') this.prevPage()
			else {
				console.log('Opening magnet link...')
				download.torrent(response)
			}
		}
		return await prompts(
			{
				type: 'select',
				name: 'torrent',
				message: "Select the torrent you'd like:",
				choices,
				initial: 0
			},
			{ onSubmit }
		)
	}
	nextPage() {
		this.currentPage++
		this.showPageOfTorrents(this.pagesOfChoices[this.currentPage])
	}
	prevPage() {
		this.currentPage--
		this.showPageOfTorrents(this.pagesOfChoices[this.currentPage])
	}
	async chooseTorrent(results) {
		const nResults = results.length
		const nextPageLink = { title: '[ Next Page ]', value: 'next' }
		const prevPageLink = { title: '[ Prev Page ]', value: 'prev' }

		this.pagesOfChoices = []
		let page = []
		for (let i = 0; i < results.length; i++) {
			const lastOfPage = i % this.resultsPageLength === 0 && i > 0
			const lastOfChoices = i === nResults - 1
			const r = results[i]
			let choice = {
				title:
					this.getFileSize(r.description).join(' ') +
					` | ${r.seeds}s | ${r.name.trim()} | ` +
					this.getUploadDateString(r.description),
				value: r.file
			}
			// add previous page link if top of page (but not the first page)
			if (page.length === 0 && i !== 0) page.push(prevPageLink)

			// push choice regardless
			page.push(choice)

			// push current page and clear it for the next one
			if (lastOfPage || lastOfChoices) {
				// if there's more pages, add a next page link
				if (!lastOfChoices) page.push(nextPageLink)
				this.pagesOfChoices.push(page)
				page = []
			}
		}
		this.showPageOfTorrents(this.pagesOfChoices[this.currentPage])
	}
	filterResults(results) {
		results = results.filter((r) => r.seeds >= this.minSeeders && this.getFileSizeInGB(r) >= this.minFileSize)
		if (this.sortBy === 'seeders') return results
		else {
			let sortValue = this.sortBy === 'fileSize' ? this.getFileSizeInGB : this.getUploadDate
			let sortFunction =
				this.sortOrder === 'ascending'
					? (a, b) => sortValue(a) - sortValue(b)
					: (a, b) => sortValue(b) - sortValue(a)

			return results.sort(sortFunction)
		}
	}
	searchTorrents() {
		let title = this.title
		let minSeeders = this.minSeeders
		let results = []
		let lastPageSearched = 0
		new Promise((resolve) => {
			const searchPage = (pageN = 0) => {
				console.log(`Searching page ${pageN + 1}...`)
				search(title, {
					baseURL: 'https://thepiratebay.org',
					page: pageN
				}).then((res) => {
					const firstResultHasMinSeeds = res[0].seeds >= minSeeders
					if (res.length > 1 && firstResultHasMinSeeds) {
						results.push(...res)
						// only continue if last item is at or above minSeeders
						const lastResultHasMinSeeds = res[res.length - 1].seeds >= minSeeders

						if (lastResultHasMinSeeds) searchPage(pageN + 1)
						else resolve()
					} else resolve()
				})
			}
			searchPage()
		}).then(() => {
			if (results.length === 0) console.log('No results :(')
			else this.chooseTorrent(this.filterResults(results))
		})
	}
}

module.exports = { Movie }
