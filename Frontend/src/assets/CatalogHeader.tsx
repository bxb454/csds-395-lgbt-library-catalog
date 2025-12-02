import React, { useState, useRef, useEffect } from "react"
import { Box, Button, Menu, MenuItem, TextField } from "@mui/material"
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown"
import LoginButton from "./LoginButton"
import NavigationMenu from "./NavigationMenu"
import { searchOptions, type SearchOption } from "./catalogSearch"
import type { UserData } from "./Types"

type PageName =
  | "catalog"
  | "myloans"
  | "allloans"
  | "updatecatalog"
  | "staffroles"

interface CatalogHeaderProps {
  searchBy: SearchOption
  searchText: string
  onSearchByChange: (value: SearchOption) => void
  onSearchTextChange: (value: string) => void
  isLoggedIn?: boolean
  currentUser?: UserData | null
  setCurrentPage?: (page: PageName) => void
  currentPage?: PageName
  onLogin?: () => void
  onLogout?: () => void
}

const CatalogHeader: React.FC<CatalogHeaderProps> = ({
  searchBy,
  searchText,
  onSearchByChange,
  onSearchTextChange,
  isLoggedIn = false,
  currentUser = null,
  setCurrentPage,
  currentPage = "catalog",
  onLogin,
  onLogout,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [navOpen, setNavOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const role = currentUser?.role ?? "patron";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNavOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const placeholderMap: Record<SearchOption, string> = {
    general: "Search by title, author, or keyword…",
    title: "Search by title…",
    author: "Search by author…",
    keyword: "Search by keyword or tag…",
    isbn: "Search by ISBN…",
    "before date": "Find books published before (YYYY)…",
    "after date": "Find books published after (YYYY)…",
  }

  // Nav Menu items
  const menuItems: { title: string; page: PageName; visible: boolean }[] = [
    { title: "Catalog Search", page: "catalog", visible: true },
    { title: "My Loans", page: "myloans", visible: true },
    { title: "All Loans", page: "allloans", visible: role === "staff" || role === "admin" },
    { title: "Add to Catalog", page: "updatecatalog", visible: role === "staff" || role === "admin" },
    { title: "Staff Roles", page: "staffroles", visible: role === "admin" },
  ];

  return (
    <Box
      sx={{
        width: "100vw",
        ml: "calc(50% - 50vw)",
        backgroundColor: "white",
        borderTop: "1px solid #999",
        borderBottom: "1px solid #999",
        padding: "1rem 0",
        boxSizing: "border-box",
        position: "relative",
        zIndex: 20,
      }}
    >
      <Box
        sx={{
          width: "85%",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >

        <Box
          sx={{
            border: "1px solid #777",
            display: "flex",
            alignItems: "center",
            width: "80%",
            height: "36px",
            paddingLeft: "10px",
            boxSizing: "border-box",
          }}
        >
          {currentPage === "catalog" ? (
            <>
              <Button
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{
                  borderRight: "1px solid #777",
                  borderRadius: 0,
                  height: "100%",
                  width: "150px",
                  fontSize: "16px",
                  color: "#444",
                  textTransform: "none",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 1,
                }}
              >
                Search by
                <ArrowDropDownIcon
                  sx={{
                    transition: "transform 0.2s ease",
                    transform: anchorEl ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {searchOptions.map((opt) => (
          <MenuItem
            key={opt}
            selected={opt === searchBy}
            onClick={() => {
              onSearchByChange(opt)
              setAnchorEl(null)
            }}
          >
            {opt
              .split(" ")
              .map((word) =>
                word.toLowerCase() === "isbn"
                  ? "ISBN"
                  : word.charAt(0).toUpperCase() + word.slice(1),
              )
              .join(" ")}
          </MenuItem>
        ))}
      </Menu>

              {/* text field */}
              <TextField
                variant="standard"
                placeholder={placeholderMap[searchBy]}
                value={searchText}
                onChange={(e) => onSearchTextChange(e.target.value)}
                sx={{
                  flex: 1,
                  mx: 1,
                  "& .MuiInputBase-root:before": { borderBottom: "none !important" },
                  "& .MuiInputBase-root:after": { borderBottom: "none !important" },
                }}
              />
            </>
          ) : (
            // Search bar replacement title
            <span style={{ fontSize: "18px", fontWeight: 500 }}>
              {currentPage === "myloans" && "My Loans"}
              {currentPage === "allloans" && "All Loans"}
              {currentPage === "updatecatalog" && "Add to Catalog"}
              {currentPage === "staffroles" && "Staff Roles"}
            </span>
          )}
        </Box>
        <Box
          sx={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >

          <Box sx={{ width: 36, display: "flex", justifyContent: "center" }}>
            {isLoggedIn && (
              <NavigationMenu onClick={() => setNavOpen(!navOpen)} />
            )}
          </Box>
          <LoginButton
            isLoggedIn={isLoggedIn}
            onLogin={onLogin ?? (() => { })}
            onLogout={onLogout ?? (() => { })}
          />
        </Box>
      </Box>
      {navOpen && (
        <div
          ref={dropdownRef}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            width: "260px",
            backgroundColor: "white",
            border: "1px solid #888",
            padding: "25px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "22px",
            zIndex: 999,
          }}
        >
          {menuItems
            .filter((item) => item.visible)
            .map((item) => (
              <div key={item.title} style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    fontSize: "22px",
                    cursor: "pointer",
                    color: currentPage === item.page ? "blue" : "black",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  onClick={() => {
                    setCurrentPage?.(item.page);
                    setNavOpen(false);
                  }}
                >
                  {item.title}
                </div>
              </div>
            ))}
        </div>
      )}
    </Box>
  )
}

export default CatalogHeader
